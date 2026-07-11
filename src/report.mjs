import { writeFile } from "node:fs/promises";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character]);
}

function headline(scan) {
  const count = scan.opportunities.length;
  if (count === 0) return "We found no confirmed cost-saving opportunities.";
  return `We found ${count} cost-saving ${count === 1 ? "opportunity" : "opportunities"}.`;
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
:root{color-scheme:light;--paper:#f5f2ed;--card:#fff;--ink:#0a0a0a;--muted:#6b6862;--rule:rgba(0,0,0,.10);--rule-strong:rgba(0,0,0,.16);--stamp:#b24a2e;--anthropic:#d97757;--mint:#9edbd3;--mono:"IBM Plex Mono",ui-monospace,"SF Mono",Menlo,monospace;--sans:"IBM Plex Sans",-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;--text-label:10px;--text-small:13px;--text-body:15px;--text-title:24px;--text-hero:clamp(34px,5vw,52px);--radius-card:12px}*{box-sizing:border-box}html{background:var(--paper)}body{margin:0;background:var(--paper);color:var(--ink);font:var(--text-body)/1.6 var(--sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}main{max-width:920px;margin:auto;padding:32px 32px 96px}.topline{align-items:center;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;padding-bottom:16px}.wordmark{font:500 12px/1 var(--mono);letter-spacing:.08em}.wordmark b{color:var(--stamp);font-weight:600}.mode,.eyebrow,.confidence,.rank,.route-id,.vendor{font:500 var(--text-label)/1.4 var(--mono);letter-spacing:.14em;text-transform:uppercase}.mode{color:var(--muted)}.hero{border-bottom:1px solid var(--rule-strong);padding:64px 0 32px}.eyebrow{color:var(--stamp);margin-bottom:20px}h1{font:400 var(--text-hero)/1.08 var(--mono);letter-spacing:-.045em;margin:0;max-width:760px}.hero-lead{color:var(--muted);font-size:16px;margin:20px 0 0;max-width:640px}.hero-meta{border-top:1px solid var(--rule);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:40px 0 0}.hero-meta div{padding:14px 16px 0 0}.hero-meta dt{color:var(--muted);font:500 var(--text-label)/1.4 var(--mono);letter-spacing:.12em;margin:0;text-transform:uppercase}.hero-meta dd{font:500 12px/1.4 var(--mono);margin:5px 0 0}.section{padding-top:64px}.section-head{margin-bottom:24px}.section-head h2{font:500 var(--text-title)/1.2 var(--mono);letter-spacing:-.025em;margin:0}.section-note{color:var(--muted);font-size:var(--text-small);margin:8px 0 0;max-width:640px}.ledger{border-block:1px solid var(--rule-strong)}h3{font:500 var(--text-body)/1.4 var(--mono);letter-spacing:-.01em;margin:0}.opportunity{align-items:start;border-top:1px solid var(--rule);display:grid;gap:18px;grid-template-columns:34px 1fr auto;padding:20px 0}.opportunity:first-child{border-top:0}.opportunity[data-primary="true"]{box-shadow:inset 3px 0 var(--mint);padding-left:14px}.opportunity p{color:var(--muted);font-size:var(--text-small);margin:5px 0 0;max-width:640px}.rank{color:var(--muted);padding-top:2px}.confidence{color:var(--muted);padding-top:3px}.route-grid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}.route{background:var(--card);border:1px solid var(--rule-strong);border-radius:var(--radius-card);padding:20px}.route-head{display:flex;justify-content:space-between}.vendor{color:var(--anthropic)}.route-id{color:var(--muted)}.route h3{margin:28px 0 8px}.route code{display:block}.route p{border-top:1px solid var(--rule);color:var(--muted);font-size:var(--text-small);margin:16px 0 0;padding-top:14px}.evidence-table{border-collapse:collapse;border-block:1px solid var(--rule-strong);width:100%}.evidence-table td{border-top:1px solid var(--rule);font-size:var(--text-small);padding:13px 0;vertical-align:top}.evidence-table tr:first-child td{border-top:0}.evidence-table td:first-child{font-family:var(--mono);font-weight:500;width:52%}.evidence-table td:last-child{text-align:right}code{color:var(--muted);font:11px/1.5 var(--mono);word-break:break-word}.notice{border-top:1px solid var(--rule-strong);color:var(--muted);font-size:var(--text-small);margin-top:64px;padding-top:20px}.notice strong{color:var(--ink);font-weight:600}.notice p{margin:5px 0 0;max-width:720px}.footer{border-top:1px solid var(--rule);color:var(--muted);display:flex;font:500 var(--text-label)/1.6 var(--mono);justify-content:space-between;letter-spacing:.08em;margin-top:64px;padding-top:16px;text-transform:uppercase}@media(max-width:720px){main{padding:24px 18px 72px}.topline{align-items:flex-start;gap:12px}.wordmark span{display:none}.hero{padding:48px 0 28px}.hero-meta{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:16px}.section{padding-top:52px}.route-grid{grid-template-columns:1fr}.opportunity{gap:12px;grid-template-columns:28px 1fr}.opportunity[data-primary="true"]{padding-left:10px}.confidence{grid-column:2}.evidence-table td{display:block;text-align:left!important;width:100%!important}.evidence-table td:first-child{padding-bottom:3px}.evidence-table td:last-child{border-top:0;padding-top:0}.footer{flex-direction:column;gap:8px}}
</style></head><body><main>
<div class="topline"><div class="wordmark"><b>LMAB</b><span> · LOWER MY AI BILL</span></div><div class="mode">CODE ONLY · STATIC ANALYSIS</div></div>
<header class="hero"><div class="eyebrow">Audit complete</div><h1>${headline(scan)}</h1>${scan.opportunities[0] ? `<p class="hero-lead">First recommendation: ${escapeHtml(scan.opportunities[0].title)}.</p>` : ""}<dl class="hero-meta"><div><dt>repository</dt><dd>${escapeHtml(scan.repository)}</dd></div><div><dt>generated</dt><dd>${created}</dd></div><div><dt>files</dt><dd>${scan.files_scanned}</dd></div><div><dt>routes</dt><dd>${scan.routes?.length ?? 0}</dd></div></dl></header>
<section class="section"><div class="section-head"><h2>Recommended changes</h2><p class="section-note">Ranked by the strength of the code signal.</p></div><div class="ledger">${renderOpportunities(scan.opportunities)}</div></section>
<section class="section"><div class="section-head"><h2>Detected routes</h2><p class="section-note">Configuration signals near each Anthropic call.</p></div><div class="route-grid">${renderRoutes(scan.routes)}</div></section>
<section class="section"><div class="section-head"><h2>Evidence</h2><p class="section-note">Runtime files only. Documentation, tests, fixtures, and examples are excluded.</p></div><table class="evidence-table"><tbody>${renderFindings(scan.findings)}</tbody></table></section>
<aside class="notice"><strong>About this report</strong><p>These are static code signals, not measured spend. Test each change before estimating savings. LMAB does not change your code or production routing.</p></aside>
<footer class="footer"><span>Generated locally by LMAB</span><span>Repository files only · artifacts under .lmab</span></footer>
</main></body></html>`;
}

export async function writeReport(path, scan) {
  await writeFile(path, reportHtml(scan), "utf8");
  return path;
}
