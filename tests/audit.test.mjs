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
    assert.match(report, /Want help acting on this\?/);
    assert.match(report, /https:\/\/api\.understudylabs\.com\/v1\/lmab\/leads/);
    assert.match(report, /Your repository name, code, and report findings are not sent/);
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

test("audit skill offers explicit opt-in follow-up without profile lookup", async () => {
  const skill = await readFile(new URL("../skills/audit/SKILL.md", import.meta.url), "utf8");
  assert.match(skill, /Group leaf calls that share one provider wrapper/);
  assert.match(skill, /observed code fact.*runtime unknown.*next measurement/s);
  assert.match(skill, /not the repository's actual spend or a realized-savings claim/);
  assert.match(skill, /Build a route-level opportunity ledger/);
  assert.match(skill, /cache_read_input_tokens/);
  assert.match(skill, /Split route candidates into cache, output\/retry, batch, cheaper Anthropic, and open-weight lanes/);
  assert.match(skill, /Would you like me to ask Understudy to follow up/);
  assert.match(skill, /https:\/\/api\.understudylabs\.com\/v1\/lmab\/leads/);
  assert.match(skill, /Do not infer a contact field from a profile/);
  assert.match(skill, /"source":"lmab-agent"/);
});
