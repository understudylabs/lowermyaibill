import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runAudit, runReport } from "../src/audit.mjs";

test("writes a local report and dependency-free share card", async () => {
  const repo = await mkdtemp(join(tmpdir(), "lmab-audit-"));
  try {
    await writeFile(join(repo, "worker.py"), `
from anthropic import Anthropic
client = Anthropic()
client.messages.create(model="claude-sonnet-4", max_tokens=5000, messages=[])
`, "utf8");
    const result = await runAudit(repo);
    assert.match(await readFile(result.report, "utf8"), /cost-saving opportunities found/);
    assert.match(await readFile(result.share_card, "utf8"), /LOWER MY AI BILL/);

    const evidence = JSON.parse(await readFile(result.evidence, "utf8"));
    evidence.sources.push({ type: "file", period: "2026-06", status: "observed" });
    evidence.savings = {
      monthly_low_usd: 1000,
      monthly_high_usd: 2500,
      percent_low: 10,
      percent_high: 25,
      confidence: "medium",
      basis: "Usage export plus conservative non-overlapping scenarios."
    };
    await writeFile(result.evidence, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    await runReport(repo);
    assert.match(await readFile(result.report, "utf8"), /\$1,000–\$2,500/);
    assert.match(await readFile(result.share_card, "utf8"), /\$1,000–\$2,500/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

