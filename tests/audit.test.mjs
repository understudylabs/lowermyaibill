import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
    await mkdir(join(repo, ".lmab"));
    await writeFile(join(repo, ".lmab", "evidence.json"), "stale external evidence\n", "utf8");
    const result = await runAudit(repo);
    const report = await readFile(result.report, "utf8");
    assert.match(report, /\$2,400\/year/);
    assert.match(report, /Modeled annual opportunity/);
    assert.match(report, /Business case/);
    assert.match(report, /\$12,000 × 20%/);
    assert.match(report, /Dollar contributions are overlap-adjusted/);
    assert.match(report, /Detected routes/);
    assert.match(report, /static code model/i);
    assert.doesNotMatch(report, /Billing evidence|connected sources|Gmail|invoice/i);
    assert.match(await readFile(result.share_card, "utf8"), /LOWER MY AI BILL/);
    assert.match(await readFile(result.share_card, "utf8"), /\$2,400/);
    assert.match(await readFile(result.share_card, "utf8"), /LOCAL CODE SCAN · STATIC ANALYSIS/);
    await assert.rejects(access(join(repo, ".lmab", "evidence.json")));

    await runReport(repo);
    assert.match(await readFile(result.report, "utf8"), />Evidence</);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
