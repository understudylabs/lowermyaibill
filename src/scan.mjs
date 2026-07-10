import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";

const ignoredDirectories = new Set([
  ".git", ".lmab", ".next", ".venv", "build", "coverage", "dist",
  "node_modules", "target", "vendor", "venv",
]);
const textExtensions = new Set([
  ".cjs", ".cs", ".go", ".java", ".js", ".json", ".jsx", ".md", ".mjs",
  ".php", ".py", ".rb", ".rs", ".sh", ".toml", ".ts", ".tsx", ".yaml", ".yml",
]);
const specialFiles = new Set([
  "Dockerfile", "Gemfile", "go.mod", "package.json", "pyproject.toml", "requirements.txt",
]);
const MAX_FILE_BYTES = 1_000_000;

const supportingDirectories = new Set([
  ".github", "docs", "documentation", "examples", "fixtures", "generated", "proto",
  "references", "moodboard", "skills", "snapshots", "snippets", "storybook", "test", "tests",
]);
const supportingNames = /^(AGENTS|CHANGELOG|CONTRIBUTING|README|SKILL)(\.[^.]+)?$/i;

const patterns = [
  { kind: "anthropic-sdk", label: "Anthropic SDK or dependency", re: /@anthropic-ai\/sdk|from\s+["']anthropic["']|require\(["']@anthropic-ai\/sdk|Anthropic\s*\(/i },
  { kind: "anthropic-call", label: "Anthropic Messages API call", re: /messages\.(create|stream)|\/v1\/messages\b/i },
  { kind: "claude-model", label: "Claude model identifier", re: /claude-(opus|sonnet|haiku)[a-z0-9._-]*/i },
  { kind: "premium-model", label: "Premium Opus model", re: /claude-opus|\bopus[-_ ]?\d/i },
  { kind: "cache-control", label: "Prompt cache control", re: /cache_control|ephemeral.*cache|prompt.?cache/i },
  { kind: "cache-usage", label: "Cache usage instrumentation", re: /cache_(read|creation)_input_tokens|cached_tokens/i },
  { kind: "batch-api", label: "Anthropic Batch API", re: /messages\.batches|\/v1\/messages\/batches/i },
  { kind: "batchable", label: "Potentially batchable or scheduled work", re: /Promise\.all|asyncio\.gather|\bcron\b|\bqueue\b|\bbackfill\b|\bworker\b/i },
  { kind: "retry", label: "Retry or backoff logic", re: /\bretr(y|ies)\b|backoff|p-retry|tenacity/i },
  { kind: "dynamic-prefix", label: "Dynamic value that may invalidate a stable prefix", re: /Date\.now|new Date\(|datetime\.now|time\.time|randomUUID|uuid\.uuid|Math\.random/i },
  { kind: "thinking", label: "Extended thinking configuration", re: /budget_tokens|thinking\s*[:=]/i },
  { kind: "premium-routing", label: "Premium routing option", re: /inference_geo|service_tier|fast.?mode/i },
];

function shouldRead(path, name) {
  if (name.startsWith(".env")) return true;
  return specialFiles.has(name) || textExtensions.has(extname(path).toLowerCase());
}

function findingScope(file) {
  const normalized = file.replaceAll("\\", "/");
  const parts = normalized.split("/");
  const name = parts.at(-1) ?? "";
  if (supportingNames.test(name) || /\.(md|mdx|rst|txt)$/i.test(name)) return "supporting";
  if (name.startsWith(".env.") || name.endsWith(".example")) return "supporting";
  if (/(^|\.)(example|fixture|spec|test)\./i.test(name)) return "supporting";
  if (parts.some((part) => supportingDirectories.has(part.toLowerCase()))) return "supporting";
  return "runtime";
}

async function walk(root, directory = root, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) await walk(root, path, files);
      continue;
    }
    if (!entry.isFile() || !shouldRead(path, entry.name)) continue;
    const info = await stat(path);
    if (info.size <= MAX_FILE_BYTES) files.push({ path, bytes: info.size });
  }
  return files;
}

function maxTokensFinding(line, file, lineNumber) {
  const match = line.match(/max_(?:output_)?tokens\s*[:=]\s*(\d+)/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (value < 4096) return null;
  return { kind: "high-output-limit", label: `High output-token limit (${value})`, file, line: lineNumber, value };
}

function buildOpportunities(findings) {
  const runtime = findings.filter((finding) => finding.scope === "runtime");
  const count = (kind) => runtime.filter((finding) => finding.kind === kind).length;
  const callSites = runtime.filter((finding) => finding.kind === "anthropic-call");
  const nearbyCount = (kind, distance = 30) => runtime.filter((finding) => finding.kind === kind && callSites.some((call) => (
    call.file === finding.file && Math.abs(call.line - finding.line) <= distance
  ))).length;
  const opportunities = [];
  const calls = count("anthropic-call");
  if (calls > 0 && count("cache-control") === 0) {
    opportunities.push({ id: "prompt-cache", title: "Add or repair prompt caching", confidence: "medium", basis: `${calls} Messages API call site(s) and no cache-control markers found.` });
  }
  if (count("premium-model") > 0) {
    opportunities.push({ id: "model-rightsizing", title: "Review premium Opus routes", confidence: "medium", basis: `${count("premium-model")} runtime premium-model reference(s) need route-level justification and usage-volume confirmation.` });
  }
  if (count("high-output-limit") > 0 || count("thinking") > 0) {
    opportunities.push({ id: "output-controls", title: "Tighten output and thinking budgets", confidence: "medium", basis: "Large output or thinking budgets are configured in runtime code; confirm actual token utilization before estimating savings." });
  }
  const volatileCallSites = nearbyCount("dynamic-prefix");
  if (volatileCallSites > 0) {
    opportunities.push({ id: "stable-prefix", title: "Inspect volatile values near Anthropic call sites", confidence: "medium", basis: `${volatileCallSites} volatile value marker(s) occur within 30 lines of a Messages API call; verify whether they appear before a cacheable prompt prefix.` });
  }
  const retriesNearCalls = nearbyCount("retry");
  if (retriesNearCalls > 0) {
    opportunities.push({ id: "retry-amplification", title: "Measure retry amplification", confidence: "medium", basis: `${retriesNearCalls} retry or backoff marker(s) occur in Anthropic call-site files and may multiply provider spend.` });
  }
  const batchMarkersNearCalls = nearbyCount("batchable");
  if (batchMarkersNearCalls > 0 && count("batch-api") === 0) {
    opportunities.push({ id: "batch", title: "Review eligible asynchronous work for batch", confidence: "medium", basis: `${batchMarkersNearCalls} scheduled, queued, or parallel-work marker(s) occur in Anthropic call-site files without a Batch API marker.` });
  }
  if (calls > 0) {
    opportunities.push({ id: "open-weight", title: "Evaluate repeated narrow routes on an open-weight model", confidence: "pending eval", basis: "A repeated Anthropic route is a candidate only after quality is measured on representative work." });
  }
  return opportunities;
}

export async function scanRepository(repoPath) {
  const repo = resolve(repoPath);
  const files = await walk(repo);
  const findings = [];
  let scannedBytes = 0;

  for (const item of files) {
    const buffer = await readFile(item.path);
    if (buffer.includes(0)) continue;
    scannedBytes += item.bytes;
    const file = relative(repo, item.path).replaceAll("\\", "/");
    const lines = buffer.toString("utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      for (const pattern of patterns) {
        if (pattern.re.test(line)) findings.push({ kind: pattern.kind, label: pattern.label, file, line: index + 1, scope: findingScope(file) });
      }
      const outputLimit = maxTokensFinding(line, file, index + 1);
      if (outputLimit) findings.push({ ...outputLimit, scope: findingScope(file) });
    }
  }

  const outputDirectory = join(repo, ".lmab");
  const outputPath = join(outputDirectory, "scan.json");
  const scan = {
    schema_version: "lmab.scan.v1",
    generated_at: new Date().toISOString(),
    repository: basename(repo),
    files_scanned: files.length,
    bytes_scanned: scannedBytes,
    findings,
    opportunities: buildOpportunities(findings),
  };
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(scan, null, 2)}\n`, "utf8");
  return { scan: outputPath, scanData: scan };
}
