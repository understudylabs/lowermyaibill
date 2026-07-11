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
  { kind: "tool-schema", label: "Tool definition or schema", re: /\btools\s*[:=]|input_schema|tool_choice/i },
  { kind: "system-prompt", label: "System prompt configuration", re: /\bsystem\s*[:=]|systemPrompt|system_prompt/i },
  { kind: "structured-output", label: "Structured output configuration", re: /output_config|json_schema|response_format|zodResponseFormat/i },
  { kind: "message-history", label: "Growing message history", re: /messages\.(push|append)|conversation(history)?\.(push|append)/i },
  { kind: "streaming", label: "Streaming response", re: /messages\.stream|stream\s*:\s*true/i },
  { kind: "fallback", label: "Model or provider fallback", re: /fallback.?model|fallback.?provider|model.?fallback/i },
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

function nearby(findings, call, kind, distance = 30) {
  return findings.filter((finding) => finding.scope === "runtime" && finding.kind === kind
    && finding.file === call.file && Math.abs(finding.line - call.line) <= distance);
}

function buildRouteCards(findings) {
  const runtime = findings.filter((finding) => finding.scope === "runtime");
  const calls = runtime.filter((finding) => finding.kind === "anthropic-call");
  return calls.map((call) => {
    const models = nearby(runtime, call, "claude-model").toSorted((left, right) => (
      Math.abs(left.line - call.line) - Math.abs(right.line - call.line)
    ));
    const values = (kind) => nearby(runtime, call, kind).map((finding) => finding.value).filter((value) => value != null);
    const count = (kind) => nearby(runtime, call, kind).length;
    const fileCount = (kind) => runtime.filter((finding) => finding.file === call.file && finding.kind === kind).length;
    return {
      id: `anthropic:${call.file}:${call.line}`,
      provider: "anthropic",
      file: call.file,
      line: call.line,
      model: models[0]?.value ?? null,
      facts: {
        cache_control_markers: count("cache-control"),
        cache_usage_markers_in_file: fileCount("cache-usage"),
        volatile_prefix_markers: count("dynamic-prefix"),
        max_output_tokens: [...new Set(values("high-output-limit"))],
        thinking_markers: count("thinking"),
        retry_markers: count("retry"),
        batch_api_markers_in_file: fileCount("batch-api"),
        batchable_markers: count("batchable"),
        premium_model_markers: count("premium-model"),
        tool_schema_markers: count("tool-schema"),
        system_prompt_markers: count("system-prompt"),
        structured_output_markers: count("structured-output"),
        message_history_markers: count("message-history"),
        streaming_markers: count("streaming"),
        fallback_markers: count("fallback"),
      },
    };
  });
}

function buildOpportunities(routes) {
  const opportunities = [];
  const routesWithoutCache = routes.filter((route) => route.facts.cache_control_markers === 0);
  if (routesWithoutCache.length > 0) {
    opportunities.push({ id: "prompt-cache", title: "Add or repair prompt caching", confidence: "medium", basis: `${routesWithoutCache.length} route(s) have no nearby cache-control marker.` });
  }
  const premiumRoutes = routes.filter((route) => route.facts.premium_model_markers > 0);
  if (premiumRoutes.length > 0) {
    opportunities.push({ id: "model-rightsizing", title: "Review premium Opus routes", confidence: "medium", basis: `${premiumRoutes.length} route(s) use a premium model and need route-level justification.` });
  }
  const outputRoutes = routes.filter((route) => route.facts.max_output_tokens.length > 0 || route.facts.thinking_markers > 0);
  if (outputRoutes.length > 0) {
    opportunities.push({ id: "output-controls", title: "Tighten output and thinking budgets", confidence: "medium", basis: `${outputRoutes.length} route(s) configure large output or thinking budgets; confirm utilization before estimating savings.` });
  }
  const volatileRoutes = routes.filter((route) => route.facts.volatile_prefix_markers > 0);
  if (volatileRoutes.length > 0) {
    opportunities.push({ id: "stable-prefix", title: "Inspect volatile values near Anthropic call sites", confidence: "medium", basis: `${volatileRoutes.length} route(s) contain nearby volatile values; verify whether they appear before a cacheable prompt prefix.` });
  }
  const retryRoutes = routes.filter((route) => route.facts.retry_markers > 0);
  if (retryRoutes.length > 0) {
    opportunities.push({ id: "retry-amplification", title: "Measure retry amplification", confidence: "medium", basis: `${retryRoutes.length} route(s) contain nearby retry or backoff logic that may multiply provider spend.` });
  }
  const batchRoutes = routes.filter((route) => route.facts.batchable_markers > 0 && route.facts.batch_api_markers_in_file === 0);
  if (batchRoutes.length > 0) {
    opportunities.push({ id: "batch", title: "Review eligible asynchronous work for batch", confidence: "medium", basis: `${batchRoutes.length} route(s) appear asynchronous or queued without a Batch API marker.` });
  }
  if (routes.length > 0) {
    opportunities.push({ id: "open-weight", title: "Evaluate narrow routes on an open-weight model", confidence: "pending eval", basis: "An Anthropic route is a candidate only after quality is measured on representative work." });
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
        const match = line.match(pattern.re);
        if (match) findings.push({
          kind: pattern.kind,
          label: pattern.label,
          file,
          line: index + 1,
          scope: findingScope(file),
          ...(pattern.kind === "claude-model" ? { value: match[0] } : {}),
        });
      }
      const outputLimit = maxTokensFinding(line, file, index + 1);
      if (outputLimit) findings.push({ ...outputLimit, scope: findingScope(file) });
    }
  }

  const outputDirectory = join(repo, ".lmab");
  const outputPath = join(outputDirectory, "scan.json");
  const routes = buildRouteCards(findings);
  const evaluationFiles = files.map((item) => relative(repo, item.path).replaceAll("\\", "/"))
    .filter((file) => /(^|\/|[._-])(eval|evaluation|benchmark|fixture|golden|rubric|scorer)([._\/-]|$)/i.test(file))
    .slice(0, 50);
  const scan = {
    schema_version: "lmab.scan.v2",
    generated_at: new Date().toISOString(),
    repository: basename(repo),
    files_scanned: files.length,
    bytes_scanned: scannedBytes,
    findings,
    routes,
    repository_facts: { evaluation_files: evaluationFiles },
    opportunities: buildOpportunities(routes),
  };
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(scan, null, 2)}\n`, "utf8");
  return { scan: outputPath, scanData: scan };
}
