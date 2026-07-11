import { writeFile } from "node:fs/promises";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character]);
}

function headline(scan) {
  return `${scan.opportunities.length}<small> cost-saving opportunities found</small>`;
}

function renderOpportunities(opportunities) {
  if (opportunities.length === 0) return "<p>No Anthropic runtime opportunities were confirmed by the static scan.</p>";
  return opportunities.map((item, index) => `
    <article class="opportunity">
      <div class="rank">${String(index + 1).padStart(2, "0")}</div>
      <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.basis)}</p></div>
      <span class="confidence">${escapeHtml(item.confidence)}</span>
    </article>`).join("");
}

function renderFindings(findings) {
  const runtime = findings.filter((finding) => finding.scope !== "supporting");
  if (runtime.length === 0) return '<tr><td colspan="2">No runtime Anthropic signals were confirmed. Documentation and test references were excluded.</td></tr>';
  const priority = new Map([
    ["anthropic-call", 0], ["premium-model", 1], ["high-output-limit", 2],
    ["thinking", 3], ["cache-control", 4], ["cache-usage", 5],
    ["retry", 6], ["batchable", 7], ["dynamic-prefix", 8],
  ]);
  const ranked = runtime.toSorted((left, right) => (
    (priority.get(left.kind) ?? 20) - (priority.get(right.kind) ?? 20)
    || left.file.localeCompare(right.file)
    || left.line - right.line
  ));
  return ranked.slice(0, 80).map((finding) => `<tr><td>${escapeHtml(finding.label)}</td><td><code>${escapeHtml(finding.file)}:${finding.line}</code></td></tr>`).join("");
}

export function reportHtml(scan) {
  const created = new Date(scan.generated_at).toLocaleString("en-US");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lower My AI Bill — ${escapeHtml(scan.repository)}</title>
<style>
:root{color-scheme:dark;--field:#000;--ink:#f2f2f0;--muted:rgba(242,242,240,.44);--faint:rgba(242,242,240,.28);--rule:rgba(255,255,255,.09);--clay:#d97757;--mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}*{box-sizing:border-box}html{background:var(--field)}body{margin:0;background:var(--field);color:var(--ink);font:14px/1.55 ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}main{max-width:1120px;margin:auto;padding:40px 32px 120px}.topline{display:flex;align-items:center;justify-content:space-between;gap:20px}.eyebrow,.section-id,.confidence,.rank{font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.16em;text-transform:uppercase}.eyebrow{color:rgba(242,242,240,.88)}.mode{border:1px solid var(--rule);border-radius:6px;color:var(--muted);font:10px var(--mono);letter-spacing:.12em;padding:7px 10px;text-transform:uppercase}.hero{background:radial-gradient(120% 90% at 50% 0%,rgba(255,255,255,.04),transparent 60%);border:1px solid var(--rule);border-radius:12px;margin-top:34px;min-height:310px;padding:44px 42px;position:relative}.hero:before{background:var(--clay);content:"";height:8px;position:absolute;right:18px;top:18px;width:8px}.hero-label{color:var(--muted);font:10px var(--mono);letter-spacing:.16em;text-transform:uppercase}h1{color:var(--clay);font:500 clamp(64px,11vw,132px)/.9 var(--mono);letter-spacing:-.07em;margin:54px 0 0}h1 small{color:rgba(242,242,240,.8);display:block;font:400 14px/1.5 ui-sans-serif,system-ui,sans-serif;letter-spacing:0;margin-top:24px}.meta{color:var(--muted);font:11px/1.5 var(--mono);letter-spacing:.04em;margin:18px 0 0}.section-head{margin:58px 0 18px}.section-id{color:var(--muted);margin-bottom:6px}.section-note{color:var(--faint);font-size:12.5px;margin:0;max-width:680px}h2{font:500 12px/1.5 var(--mono);letter-spacing:.18em;margin:0;text-transform:uppercase}h3{font-size:15px;font-weight:500;letter-spacing:-.01em;margin:0}.panel{background:radial-gradient(120% 90% at 50% 0%,rgba(255,255,255,.035),transparent 60%);border:1px solid var(--rule);border-radius:12px;overflow:hidden}.opportunity{align-items:start;border-top:1px solid var(--rule);display:grid;gap:18px;grid-template-columns:42px 1fr auto;padding:22px 24px}.opportunity:first-child{border-top:0}.opportunity p{color:var(--muted);font-size:13px;margin:6px 0}.rank{border:1px solid rgba(255,255,255,.14);border-radius:4px;color:rgba(242,242,240,.7);padding:3px 5px;text-align:center}.confidence{background:rgba(255,255,255,.035);border:1px solid var(--rule);border-radius:6px;color:var(--clay);padding:7px 9px}table{border-collapse:collapse;width:100%}td{border-top:1px solid var(--rule);padding:14px 18px;vertical-align:top}tr:first-child td{border-top:0}td:first-child{color:rgba(242,242,240,.74);width:42%}code{color:var(--muted);font:11px/1.5 var(--mono);word-break:break-all}.notice{border-left:2px solid var(--clay);color:var(--muted);font-size:12.5px;padding:4px 0 4px 18px}.notice strong{color:rgba(242,242,240,.85);font-weight:500}footer{color:var(--faint);font:10px/1.6 var(--mono);letter-spacing:.08em;padding-top:42px;text-transform:uppercase}@media(max-width:700px){main{padding:28px 18px 80px}.hero{min-height:270px;padding:32px 24px}.opportunity{grid-template-columns:34px 1fr}.confidence{grid-column:2;justify-self:start}.topline{align-items:flex-start;flex-direction:column}}
</style></head><body><main>
<header><div class="topline"><div class="eyebrow">Lower My AI Bill · local code scan</div><div class="mode">static analysis</div></div><div class="hero"><div class="hero-label">01 · code scan</div><h1>${headline(scan)}</h1><p class="meta">${escapeHtml(scan.repository)} · ${created} · ${scan.files_scanned} files scanned</p></div></header>
<section><div class="section-head"><div class="section-id">02 · ranked interventions</div><h2>Largest opportunities</h2><p class="section-note">Fewer words. Every recommendation cites the code signal that earned it a place.</p></div><div class="panel">${renderOpportunities(scan.opportunities)}</div></section>
<section><div class="section-head"><div class="section-id">03 · observed signals</div><h2>Runtime code evidence</h2><p class="section-note">Documentation, tests, fixtures, and examples are retained in the scan ledger but excluded from this ranked view.</p></div><div class="panel"><table><tbody>${renderFindings(scan.findings)}</tbody></table></div></section>
<section><div class="section-head"><div class="section-id">04 · claim boundary</div></div><div class="notice"><strong>Static code signals, not measured spend.</strong> These findings identify places worth testing. They do not prove a savings percentage or guarantee realized savings. This report does not change code or production routing.</div></section>
<footer>Generated locally by LMAB. The scanner reads repository files only and writes its artifacts under .lmab.</footer>
</main></body></html>`;
}

export async function writeReport(path, scan) {
  await writeFile(path, reportHtml(scan), "utf8");
  return path;
}
