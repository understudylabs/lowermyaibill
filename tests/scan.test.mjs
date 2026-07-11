import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { scanRepository } from "../src/scan.mjs";

test("finds actionable Anthropic cost signals without copying source text", async () => {
  const repo = await mkdtemp(join(tmpdir(), "lmab-scan-"));
  try {
    await writeFile(join(repo, "app.ts"), `
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
await client.messages.create({
  model: "claude-opus-4-1",
  max_tokens: 8192,
  messages: [{ role: "user", content: Date.now() + secretPrompt }],
});
`, "utf8");
    const { scan, scanData } = await scanRepository(repo);
    assert.equal(scanData.schema_version, "lmab.scan.v1");
    assert.ok(scanData.findings.some((finding) => finding.kind === "anthropic-call"));
    assert.ok(scanData.opportunities.some((item) => item.id === "prompt-cache"));
    assert.ok(scanData.opportunities.some((item) => item.id === "stable-prefix"));
    assert.ok(scanData.opportunities.some((item) => item.id === "model-rightsizing"));
    assert.ok(scanData.opportunities.some((item) => item.id === "output-controls"));
    const serialized = await readFile(scan, "utf8");
    assert.doesNotMatch(serialized, /secretPrompt/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("does not turn documentation, tests, or unrelated timestamps into runtime opportunities", async () => {
  const repo = await mkdtemp(join(tmpdir(), "lmab-scope-"));
  try {
    await Promise.all([
      mkdir(join(repo, "docs")),
      mkdir(join(repo, "proto")),
      mkdir(join(repo, "tests")),
    ]);
    await writeFile(join(repo, "docs", "architecture.md"), "Use claude-opus with messages.create and retry queues.\n", "utf8");
    await writeFile(join(repo, "tests", "client.test.ts"), "client.messages.create({ model: 'claude-opus' });\n", "utf8");
    await writeFile(join(repo, "client.fixture.json"), "{\"model\":\"claude-opus\"}\n", "utf8");
    await writeFile(join(repo, ".env.example"), "MODEL=claude-opus\n", "utf8");
    await writeFile(join(repo, "proto", "data.ts"), "const sample = 'messages.create claude-opus';\n", "utf8");
    await writeFile(join(repo, "clock.ts"), "export const now = Date.now();\n", "utf8");
    await writeFile(join(repo, "client.ts"), "client.messages.create({ model: 'claude-sonnet-4' });\n", "utf8");

    const { scanData } = await scanRepository(repo);
    assert.equal(scanData.findings.find((finding) => finding.file === "docs/architecture.md").scope, "supporting");
    assert.equal(scanData.findings.find((finding) => finding.file === "client.fixture.json").scope, "supporting");
    assert.equal(scanData.findings.find((finding) => finding.file === ".env.example").scope, "supporting");
    assert.equal(scanData.findings.find((finding) => finding.file === "proto/data.ts").scope, "supporting");
    assert.ok(scanData.opportunities.some((item) => item.id === "prompt-cache"));
    assert.ok(!scanData.opportunities.some((item) => item.id === "model-rightsizing"));
    assert.ok(!scanData.opportunities.some((item) => item.id === "stable-prefix"));
    assert.ok(!scanData.opportunities.some((item) => item.id === "retry-amplification"));
    assert.ok(!scanData.opportunities.some((item) => item.id === "batch"));
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
