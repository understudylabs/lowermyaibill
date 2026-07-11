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
    <article class="opportunity"${index === 0 ? ' data-primary="true"' : ""}>
      <div class="rank">${String(index + 1).padStart(2, "0")}</div>
      <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.basis)}</p></div>
      <span class="confidence">${escapeHtml(item.confidence)}</span>
    </article>`).join("");
}

function renderRoutes(routes = []) {
  if (routes.length === 0) return "<p>No runtime Anthropic routes were detected.</p>";
  return routes.map((route, index) => {
    const facts = route.facts ?? {};
    const labels = [
      facts.cache_control_markers > 0 ? "cache marker" : "no cache marker",
      facts.cache_usage_markers_in_file > 0 ? "cache usage marker in file" : "no cache usage marker in file",
      ...(facts.max_output_tokens ?? []).map((value) => `max output ${value}`),
      facts.volatile_prefix_markers > 0 ? `${facts.volatile_prefix_markers} volatile marker(s)` : null,
      facts.retry_markers > 0 ? `${facts.retry_markers} retry marker(s)` : null,
      facts.batchable_markers > 0 ? `${facts.batchable_markers} async marker(s)` : null,
      facts.tool_schema_markers > 0 ? "tool schema" : null,
      facts.structured_output_markers > 0 ? "structured output" : null,
    ].filter(Boolean);
    return `<article class="route"><div class="route-head"><span class="vendor">Anthropic</span><span class="route-id">route ${String(index + 1).padStart(2, "0")}</span></div><h3>${escapeHtml(route.model ?? "Anthropic route")}</h3><code>${escapeHtml(route.file)}:${route.line}</code><p>${escapeHtml(labels.join(" · "))}</p></article>`;
  }).join("");
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
:root{color-scheme:light;--paper:#f5f2ed;--card:#fff;--ink:#0a0a0a;--muted:#6b6862;--rule:rgba(0,0,0,.10);--rule-strong:rgba(0,0,0,.16);--stamp:#b24a2e;--anthropic:#d97757;--mint:#9edbd3;--mono:"IBM Plex Mono",ui-monospace,"SF Mono",Menlo,monospace;--sans:"IBM Plex Sans",-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;--radius-id:4px;--radius-card:12px}*{box-sizing:border-box}html{background:var(--paper)}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.6 var(--sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}main{max-width:1120px;margin:auto;padding:32px 32px 128px}.topline{align-items:center;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;padding:0 0 18px}.wordmark{font:500 12px/1 var(--mono);letter-spacing:.08em}.wordmark b{color:var(--stamp);font-weight:600}.mode,.section-id,.confidence,.rank,.route-id,.vendor{font:500 10px/1.4 var(--mono);letter-spacing:.15em;text-transform:uppercase}.mode{color:var(--muted)}.hero{border-bottom:1px solid var(--rule-strong);display:grid;gap:40px;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);padding:96px 0}.hero-label{color:var(--stamp);font:500 10px/1 var(--mono);letter-spacing:.17em;text-transform:uppercase}h1{font:400 clamp(76px,12vw,148px)/.78 var(--mono);letter-spacing:-.075em;margin:42px 0 0}h1 small{display:block;font:400 clamp(24px,3.7vw,44px)/1.05 var(--mono);letter-spacing:-.045em;margin-top:28px;max-width:640px}.hero-meta{align-self:end;border-top:1px solid var(--rule);display:grid}.hero-meta div{border-bottom:1px solid var(--rule);display:grid;gap:20px;grid-template-columns:92px 1fr;padding:14px 0}.hero-meta dt{color:var(--muted);font:500 9px/1.4 var(--mono);letter-spacing:.13em;margin:0;text-transform:uppercase}.hero-meta dd{font:500 12px/1.4 var(--mono);margin:0;text-align:right}.section{padding-top:96px}.section-head{display:grid;gap:24px;grid-template-columns:200px 1fr;margin-bottom:36px}.section-id{color:var(--muted)}.section-title h2{font:400 clamp(30px,4vw,52px)/1.05 var(--mono);letter-spacing:-.045em;margin:0}.section-note{color:var(--muted);font-size:14px;margin:14px 0 0;max-width:660px}.ledger{border-block:1px solid var(--rule-strong)}h3{font:500 16px/1.35 var(--mono);letter-spacing:-.015em;margin:0}.opportunity{align-items:start;border-top:1px solid var(--rule);display:grid;gap:24px;grid-template-columns:46px 1fr auto;padding:26px 0}.opportunity:first-child{border-top:0}.opportunity[data-primary="true"]{box-shadow:inset 4px 0 var(--mint);padding-left:20px}.opportunity p{color:var(--muted);font-size:13.5px;margin:7px 0 0;max-width:700px}.rank{border:1px solid var(--rule-strong);border-radius:var(--radius-id);padding:5px;text-align:center}.confidence{border:1px solid var(--rule-strong);border-radius:999px;color:var(--muted);padding:6px 9px}.route-grid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}.route{background:var(--card);border:1px solid var(--rule-strong);border-radius:var(--radius-card);min-height:230px;padding:24px}.route-head{display:flex;justify-content:space-between}.vendor{color:var(--anthropic)}.route-id{color:var(--muted)}.route h3{font-size:22px;margin:58px 0 10px}.route code{display:block}.route p{border-top:1px solid var(--rule);color:var(--muted);font-size:13px;margin:18px 0 0;padding-top:16px}.evidence-table{border-collapse:collapse;border-block:1px solid var(--rule-strong);width:100%}.evidence-table td{border-top:1px solid var(--rule);padding:16px 0;vertical-align:top}.evidence-table tr:first-child td{border-top:0}.evidence-table td:first-child{font:500 13px/1.5 var(--mono);width:46%}.evidence-table td:last-child{text-align:right}code{color:var(--muted);font:11px/1.5 var(--mono);word-break:break-word}.notice{background:var(--card);border-left:3px solid var(--stamp);color:var(--muted);font-size:14px;padding:24px 28px}.notice strong{color:var(--ink);font-weight:600}.footer{border-top:1px solid var(--rule);color:var(--muted);display:flex;font:500 9px/1.6 var(--mono);justify-content:space-between;letter-spacing:.09em;margin-top:96px;padding-top:20px;text-transform:uppercase}@media(max-width:720px){main{padding:24px 18px 80px}.topline{align-items:flex-start;gap:12px}.wordmark span{display:none}.hero{gap:56px;grid-template-columns:1fr;padding:72px 0}.hero-meta{align-self:auto}.section{padding-top:72px}.section-head{gap:14px;grid-template-columns:1fr}.route-grid{grid-template-columns:1fr}.opportunity{gap:14px;grid-template-columns:38px 1fr}.opportunity[data-primary="true"]{padding-left:12px}.confidence{grid-column:2;justify-self:start}.evidence-table td{display:block;text-align:left!important;width:100%!important}.evidence-table td:first-child{padding-bottom:4px}.evidence-table td:last-child{border-top:0;padding-top:0}.footer{flex-direction:column;gap:10px}}
</style></head><body><main>
<div class="topline"><div class="wordmark"><b>LMAB</b><span> · LOWER MY AI BILL</span></div><div class="mode">CODE ONLY · STATIC ANALYSIS</div></div>
<header class="hero"><div><div class="hero-label">01 · scan result</div><h1>${headline(scan)}</h1></div><dl class="hero-meta"><div><dt>repository</dt><dd>${escapeHtml(scan.repository)}</dd></div><div><dt>generated</dt><dd>${created}</dd></div><div><dt>scope</dt><dd>${scan.files_scanned} files</dd></div><div><dt>routes</dt><dd>${scan.routes?.length ?? 0} detected</dd></div></dl></header>
<section class="section"><div class="section-head"><div class="section-id">02 · ranked interventions</div><div class="section-title"><h2>Start here.</h2><p class="section-note">Every recommendation cites the code signal that earned it a place. The first route is the strongest static lead, not a measured saving.</p></div></div><div class="ledger">${renderOpportunities(scan.opportunities)}</div></section>
<section class="section"><div class="section-head"><div class="section-id">03 · route map</div><div class="section-title"><h2>What the scanner found.</h2><p class="section-note">Route cards group nearby configuration signals without copying source content.</p></div></div><div class="route-grid">${renderRoutes(scan.routes)}</div></section>
<section class="section"><div class="section-head"><div class="section-id">04 · observed signals</div><div class="section-title"><h2>Evidence before claim.</h2><p class="section-note">Documentation, tests, fixtures, and examples remain in the scan ledger but stay out of this runtime view.</p></div></div><table class="evidence-table"><tbody>${renderFindings(scan.findings)}</tbody></table></section>
<section class="section"><div class="section-head"><div class="section-id">05 · claim boundary</div><div class="section-title"><h2>What this proves.</h2></div></div><div class="notice"><strong>Static code signals, not measured spend.</strong> These findings identify places worth testing. They do not prove a savings percentage or guarantee realized savings. This report does not change code or production routing.</div></section>
<footer class="footer"><span>Generated locally by LMAB</span><span>Repository files only · artifacts under .lmab</span></footer>
</main></body></html>`;
}

export async function writeReport(path, scan) {
  await writeFile(path, reportHtml(scan), "utf8");
  return path;
}
