import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
    assert.ok(scanData.opportunities.some((item) => item.id === "model-rightsizing"));
    assert.ok(scanData.opportunities.some((item) => item.id === "output-controls"));
    const serialized = await readFile(scan, "utf8");
    assert.doesNotMatch(serialized, /secretPrompt/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

