import { writeFile } from "node:fs/promises";
import { estimateOpportunity, formatUsd } from "./estimate.mjs";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character]);
}

const recommendationGuidance = new Map([
  ["prompt-cache", { play: "Put stable instructions and tool definitions behind Anthropic cache controls, then verify cache-read usage.", risk: "Low — confirm the prefix is stable before rollout." }],
  ["model-rightsizing", { play: "Replay representative requests against a cheaper model and switch only after it meets the quality bar.", risk: "Medium — requires a route-specific held-out eval." }],
  ["output-controls", { play: "Measure actual completion length, then lower output and thinking budgets to the observed need.", risk: "Low — watch truncation and task completion." }],
  ["stable-prefix", { play: "Move timestamps, IDs, and other volatile values after the reusable prompt prefix.", risk: "Low — preserve prompt meaning and ordering." }],
  ["retry-amplification", { play: "Measure retries by failure class and stop retrying errors that cannot succeed on another attempt.", risk: "Medium — keep recovery for transient provider failures." }],
  ["batch", { play: "Move non-interactive queued work onto the Batch API and compare completion time against the SLA.", risk: "Medium — batch is unsuitable for latency-sensitive paths." }],
  ["open-weight", { play: "Build a representative eval set and compare an open-weight candidate before changing production routing.", risk: "High — excluded from savings until quality is proven." }],
]);

function formatPercent(value) {
  return `${Math.round(value * 1_000) / 10}%`;
}

function renderOpportunities(opportunities, estimate) {
  if (opportunities.length === 0) return "<p>No Anthropic runtime opportunities were confirmed by the static scan.</p>";
  const values = new Map(estimate.breakdown.map((item) => [item.id, item]));
  return opportunities.map((item, index) => `
    <article class="opportunity"${index === 0 ? ' data-primary="true"' : ""}>
      <div class="rank">${String(index + 1).padStart(2, "0")}</div>
      <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.basis)}</p><dl class="recommendation-detail"><div><dt>Play</dt><dd>${escapeHtml(recommendationGuidance.get(item.id)?.play ?? item.title)}</dd></div><div><dt>Risk</dt><dd>${escapeHtml(recommendationGuidance.get(item.id)?.risk ?? item.confidence)}</dd></div></dl></div>
      <div class="opportunity-value"><strong>${values.get(item.id)?.annual_savings_usd > 0 ? `${formatUsd(values.get(item.id).annual_savings_usd)}/yr` : "Not included"}</strong><span>${values.get(item.id)?.base_rate > 0 ? `${formatPercent(values.get(item.id).applied_rate)} applied` : "pending eval"}</span></div>
    </article>`).join("");
}

function renderBusinessCase(estimate) {
  const routeWord = estimate.routes === 1 ? "route" : "routes";
  const scenarios = [500, estimate.monthly_spend_per_route_usd, 2_500].map((monthly) => ({
    monthly,
    annual: Math.round(monthly * estimate.routes * 12 * estimate.savings_rate),
  }));
  return `<div class="calculation">
    <div><span>Modeled annual spend</span><code>${formatUsd(estimate.monthly_spend_per_route_usd)}/month × ${estimate.routes} ${routeWord} × 12</code><strong>${formatUsd(estimate.annual_baseline_usd)}</strong></div>
    <div><span>Signals before overlap</span><code>sum of detected opportunity rates</code><strong>${formatPercent(estimate.raw_savings_rate)}</strong></div>
    <div><span>Applied savings rate</span><code>min(${formatPercent(estimate.raw_savings_rate)}, ${formatPercent(estimate.max_savings_rate)} cap)</code><strong>${formatPercent(estimate.savings_rate)}</strong></div>
    <div class="calculation-total"><span>Modeled annual opportunity</span><code>${formatUsd(estimate.annual_baseline_usd)} × ${formatPercent(estimate.savings_rate)}</code><strong>${formatUsd(estimate.annual_savings_usd)}</strong></div>
  </div><div class="sensitivity"><div><span>Monthly spend / route</span>${scenarios.map((scenario) => `<strong>${formatUsd(scenario.monthly)}</strong>`).join("")}</div><div><span>Annual opportunity</span>${scenarios.map((scenario) => `<strong>${formatUsd(scenario.annual)}</strong>`).join("")}</div></div>`;
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
  const estimate = estimateOpportunity(scan);
  const opportunityCount = scan.opportunities.length;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lower My AI Bill — ${escapeHtml(scan.repository)}</title>
<style>
:root{color-scheme:light;--paper:#f5f2ed;--card:#fff;--ink:#0a0a0a;--muted:#6b6862;--rule:rgba(0,0,0,.10);--rule-strong:rgba(0,0,0,.16);--stamp:#b24a2e;--anthropic:#d97757;--mint:#9edbd3;--mono:"IBM Plex Mono",ui-monospace,"SF Mono",Menlo,monospace;--sans:"IBM Plex Sans",-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;--text-label:10px;--text-small:13px;--text-body:15px;--text-title:24px;--text-hero:clamp(34px,5vw,52px);--radius-card:12px}*{box-sizing:border-box}html{background:var(--paper)}body{margin:0;background:var(--paper);color:var(--ink);font:var(--text-body)/1.6 var(--sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}main{max-width:920px;margin:auto;padding:32px 32px 96px}.topline{align-items:center;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;padding-bottom:16px}.wordmark{font:500 12px/1 var(--mono);letter-spacing:.08em}.wordmark b{color:var(--stamp);font-weight:600}.mode,.eyebrow,.rank,.route-id,.vendor{font:500 var(--text-label)/1.4 var(--mono);letter-spacing:.14em;text-transform:uppercase}.mode{color:var(--muted)}.hero{border-bottom:1px solid var(--rule-strong);padding:64px 0 32px}.eyebrow{color:var(--stamp);margin-bottom:20px}h1{font:400 var(--text-hero)/1.08 var(--mono);letter-spacing:-.045em;margin:0;max-width:760px}.hero-lead{color:var(--muted);font-size:16px;margin:20px 0 0;max-width:640px}.hero-meta{border-top:1px solid var(--rule);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:40px 0 0}.hero-meta div{padding:14px 16px 0 0}.hero-meta dt{color:var(--muted);font:500 var(--text-label)/1.4 var(--mono);letter-spacing:.12em;margin:0;text-transform:uppercase}.hero-meta dd{font:500 12px/1.4 var(--mono);margin:5px 0 0}.section{padding-top:64px}.section-head{margin-bottom:24px}.section-head h2{font:500 var(--text-title)/1.2 var(--mono);letter-spacing:-.025em;margin:0}.section-note{color:var(--muted);font-size:var(--text-small);margin:8px 0 0;max-width:640px}.ledger{border-block:1px solid var(--rule-strong)}h3{font:500 var(--text-body)/1.4 var(--mono);letter-spacing:-.01em;margin:0}.opportunity{align-items:start;border-top:1px solid var(--rule);display:grid;gap:18px;grid-template-columns:34px 1fr 118px;padding:24px 0}.opportunity:first-child{border-top:0}.opportunity[data-primary="true"]{box-shadow:inset 3px 0 var(--mint);padding-left:14px}.opportunity p{color:var(--muted);font-size:var(--text-small);margin:5px 0 0;max-width:640px}.rank{color:var(--muted);padding-top:2px}.opportunity-value{text-align:right}.opportunity-value strong{display:block;font:500 15px/1.4 var(--mono)}.opportunity-value span{color:var(--muted);display:block;font:500 10px/1.4 var(--mono);letter-spacing:.1em;margin-top:4px;text-transform:uppercase}.recommendation-detail{border-top:1px solid var(--rule);display:grid;gap:7px;margin:16px 0 0;padding-top:12px}.recommendation-detail div{display:grid;gap:10px;grid-template-columns:36px 1fr}.recommendation-detail dt{color:var(--muted);font:500 10px/1.5 var(--mono);letter-spacing:.1em;text-transform:uppercase}.recommendation-detail dd{font-size:12px;line-height:1.5;margin:0}.calculation{border-block:1px solid var(--rule-strong)}.calculation>div{align-items:center;border-top:1px solid var(--rule);display:grid;gap:16px;grid-template-columns:190px 1fr auto;padding:14px 0}.calculation>div:first-child{border-top:0}.calculation span{font:500 13px/1.5 var(--mono)}.calculation strong{font:500 15px/1.4 var(--mono)}.calculation-total{background:var(--card);box-shadow:inset 3px 0 var(--mint);padding-left:14px!important}.sensitivity{border-bottom:1px solid var(--rule-strong);margin-top:24px}.sensitivity>div{border-top:1px solid var(--rule);display:grid;gap:16px;grid-template-columns:190px repeat(3,1fr);padding:12px 0}.sensitivity span{color:var(--muted);font-size:var(--text-small)}.sensitivity strong{font:500 13px/1.4 var(--mono);text-align:right}.route-grid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}.route{background:var(--card);border:1px solid var(--rule-strong);border-radius:var(--radius-card);padding:20px}.route-head{display:flex;justify-content:space-between}.vendor{color:var(--anthropic)}.route-id{color:var(--muted)}.route h3{margin:28px 0 8px}.route code{display:block}.route p{border-top:1px solid var(--rule);color:var(--muted);font-size:var(--text-small);margin:16px 0 0;padding-top:14px}.evidence-table{border-collapse:collapse;border-block:1px solid var(--rule-strong);width:100%}.evidence-table td{border-top:1px solid var(--rule);font-size:var(--text-small);padding:13px 0;vertical-align:top}.evidence-table tr:first-child td{border-top:0}.evidence-table td:first-child{font-family:var(--mono);font-weight:500;width:52%}.evidence-table td:last-child{text-align:right}code{color:var(--muted);font:11px/1.5 var(--mono);word-break:break-word}.notice{border-top:1px solid var(--rule-strong);color:var(--muted);font-size:var(--text-small);margin-top:64px;padding-top:20px}.notice strong{color:var(--ink);font-weight:600}.notice p{margin:5px 0 0;max-width:720px}.footer{border-top:1px solid var(--rule);color:var(--muted);display:flex;font:500 var(--text-label)/1.6 var(--mono);justify-content:space-between;letter-spacing:.08em;margin-top:64px;padding-top:16px;text-transform:uppercase}@media(max-width:720px){main{padding:24px 18px 72px}.topline{align-items:flex-start;gap:12px}.wordmark span{display:none}.hero{padding:48px 0 28px}.hero-meta{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:16px}.section{padding-top:52px}.calculation>div{align-items:start;grid-template-columns:1fr auto}.calculation code{grid-column:1/-1;grid-row:2}.sensitivity>div{grid-template-columns:1fr repeat(3,auto)}.route-grid{grid-template-columns:1fr}.opportunity{gap:12px;grid-template-columns:28px 1fr}.opportunity[data-primary="true"]{padding-left:10px}.opportunity-value{grid-column:2;text-align:left}.evidence-table td{display:block;text-align:left!important;width:100%!important}.evidence-table td:first-child{padding-bottom:3px}.evidence-table td:last-child{border-top:0;padding-top:0}.footer{flex-direction:column;gap:8px}}
</style></head><body><main>
<div class="topline"><div class="wordmark"><b>LMAB</b><span> · LOWER MY AI BILL</span></div><div class="mode">CODE ONLY · STATIC ANALYSIS</div></div>
<header class="hero"><div class="eyebrow">Modeled annual opportunity</div><h1>${formatUsd(estimate.annual_savings_usd)}/year</h1><p class="hero-lead">Across ${estimate.routes} detected ${estimate.routes === 1 ? "route" : "routes"} and ${opportunityCount} code ${opportunityCount === 1 ? "finding" : "findings"}.</p><dl class="hero-meta"><div><dt>repository</dt><dd>${escapeHtml(scan.repository)}</dd></div><div><dt>generated</dt><dd>${created}</dd></div><div><dt>files</dt><dd>${scan.files_scanned}</dd></div><div><dt>routes</dt><dd>${estimate.routes}</dd></div></dl></header>
<section class="section"><div class="section-head"><h2>Business case</h2><p class="section-note">Spend is the dominant unknown. The center case uses a transparent per-route baseline; the sensitivity cases show how the result moves with actual spend.</p></div>${renderBusinessCase(estimate)}</section>
<section class="section"><div class="section-head"><h2>Recommended changes</h2><p class="section-note">Dollar contributions are overlap-adjusted and add back to the headline.</p></div><div class="ledger">${renderOpportunities(scan.opportunities, estimate)}</div></section>
<section class="section"><div class="section-head"><h2>Detected routes</h2><p class="section-note">Configuration signals near each Anthropic call.</p></div><div class="route-grid">${renderRoutes(scan.routes)}</div></section>
<section class="section"><div class="section-head"><h2>Evidence</h2><p class="section-note">Runtime files only. Documentation, tests, fixtures, and examples are excluded.</p></div><table class="evidence-table"><tbody>${renderFindings(scan.findings)}</tbody></table></section>
<aside class="notice"><strong>How this estimate works</strong><p>This is a static code model, not measured spend. LMAB models ${formatUsd(estimate.monthly_spend_per_route_usd)} in monthly Anthropic spend per detected route, applies conservative rates for the signals found, and caps total savings at 50%. Open-weight replacement is excluded until it passes an eval. Replace the model with measured spend before sharing.</p></aside>
<footer class="footer"><span>Generated locally by LMAB</span><span>Repository files only · artifacts under .lmab</span></footer>
</main></body></html>`;
}

export async function writeReport(path, scan) {
  await writeFile(path, reportHtml(scan), "utf8");
  return path;
}
