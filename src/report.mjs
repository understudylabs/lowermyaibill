import { writeFile } from "node:fs/promises";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character]);
}

function money(value) {
  return typeof value === "number" ? `$${Math.round(value).toLocaleString("en-US")}` : null;
}

function headline(scan, evidence) {
  const low = money(evidence?.savings?.monthly_low_usd);
  const high = money(evidence?.savings?.monthly_high_usd);
  if (low && high) return `${low}–${high}<small> estimated monthly savings</small>`;
  return `${scan.opportunities.length}<small> cost-saving opportunities found</small>`;
}

function renderOpportunities(opportunities) {
  if (opportunities.length === 0) return "<p>No Anthropic runtime opportunities were confirmed by the static scan.</p>";
  return opportunities.map((item, index) => `
    <article class="opportunity">
      <div class="rank">${index + 1}</div>
      <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.basis)}</p></div>
      <span class="confidence">${escapeHtml(item.confidence)}</span>
    </article>`).join("");
}

function renderSources(sources = []) {
  if (sources.length === 0) return "<p>No billing source was available. Savings remain unquantified.</p>";
  return `<ul>${sources.map((source) => `<li>${escapeHtml(source.type ?? "source")} · ${escapeHtml(source.period ?? "period unknown")} · ${escapeHtml(source.status ?? "observed")}</li>`).join("")}</ul>`;
}

function renderFindings(findings) {
  return findings.slice(0, 80).map((finding) => `<tr><td>${escapeHtml(finding.label)}</td><td><code>${escapeHtml(finding.file)}:${finding.line}</code></td></tr>`).join("");
}

export function reportHtml(scan, evidence) {
  const created = new Date(scan.generated_at).toLocaleString("en-US");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lower My AI Bill — ${escapeHtml(scan.repository)}</title>
<style>
:root{color-scheme:light;--ink:#111713;--muted:#667069;--paper:#f4f7f3;--rule:#d4ddd5;--accent:#e4572f}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 ui-sans-serif,system-ui,-apple-system,sans-serif}main{max-width:980px;margin:auto;padding:48px 24px 80px}header{border-bottom:1px solid var(--rule);padding-bottom:36px}.eyebrow,.confidence{color:var(--accent);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}h1{font-size:clamp(42px,8vw,88px);letter-spacing:-.055em;line-height:.94;margin:16px 0}h1 small{display:block;color:var(--muted);font-size:18px;font-weight:400;letter-spacing:0;line-height:1.4;margin-top:18px}h2{font-size:30px;letter-spacing:-.03em;margin:0 0 20px}h3{margin:0;font-size:18px}section{padding:36px 0;border-bottom:1px solid var(--rule)}.meta{color:var(--muted)}.opportunity{display:grid;grid-template-columns:36px 1fr auto;gap:18px;padding:20px 0;border-top:1px solid var(--rule)}.opportunity p{color:var(--muted);margin:6px 0}.rank{font-size:22px}table{border-collapse:collapse;width:100%}td{border-top:1px solid var(--rule);padding:12px 8px;vertical-align:top}td:first-child{width:46%}code{font-size:13px;word-break:break-all}.notice{background:#fff8ed;border:1px solid #ead8bc;padding:18px}footer{color:var(--muted);font-size:13px;padding-top:30px}@media(max-width:640px){.opportunity{grid-template-columns:28px 1fr}.confidence{grid-column:2}}
</style></head><body><main>
<header><div class="eyebrow">Lower My AI Bill · local audit</div><h1>${headline(scan, evidence)}</h1><p class="meta">${escapeHtml(scan.repository)} · ${created} · ${scan.files_scanned} files scanned</p></header>
<section><h2>Largest opportunities</h2>${renderOpportunities(scan.opportunities)}</section>
<section><h2>Billing evidence</h2>${renderSources(evidence.sources)}<p>${escapeHtml(evidence?.savings?.basis ?? "Add an Anthropic usage export or connected billing source to quantify the opportunity.")}</p></section>
<section><h2>Code evidence</h2><table><tbody>${renderFindings(scan.findings)}</tbody></table></section>
<section><div class="notice"><strong>Evidence labels matter.</strong> Static findings are observed in code. Dollar ranges are estimates until a measured candidate is evaluated. This report does not change code or production routing.</div></section>
<footer>Generated locally by LMAB. No source code, prompts, traces, or billing documents were uploaded by the report generator.</footer>
</main></body></html>`;
}

export async function writeReport(path, scan, evidence) {
  await writeFile(path, reportHtml(scan, evidence), "utf8");
  return path;
}

