import { writeFile } from "node:fs/promises";

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;",
  })[character]);
}

function cardResult(scan, evidence) {
  const low = evidence?.savings?.monthly_low_usd;
  const high = evidence?.savings?.monthly_high_usd;
  if (typeof low === "number" && typeof high === "number") {
    return { value: `$${Math.round(low).toLocaleString("en-US")}–$${Math.round(high).toLocaleString("en-US")}`, label: "estimated monthly savings" };
  }
  return { value: String(scan.opportunities.length), label: "cost-saving opportunities found" };
}

export async function writeShareCard(path, scan, evidence) {
  const result = cardResult(scan, evidence);
  const top = scan.opportunities[0]?.title ?? "Anthropic spend audit complete";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f4f7f3"/><rect x="48" y="48" width="1104" height="534" rx="28" fill="#fff" stroke="#d4ddd5"/>
<text x="92" y="118" fill="#e4572f" font-family="system-ui,sans-serif" font-size="24" font-weight="700" letter-spacing="3">LOWER MY AI BILL</text>
<text x="92" y="305" fill="#111713" font-family="system-ui,sans-serif" font-size="92" font-weight="650" letter-spacing="-4">${escapeXml(result.value)}</text>
<text x="96" y="360" fill="#667069" font-family="system-ui,sans-serif" font-size="30">${escapeXml(result.label)}</text>
<line x1="92" y1="430" x2="1108" y2="430" stroke="#d4ddd5"/>
<text x="92" y="493" fill="#111713" font-family="system-ui,sans-serif" font-size="28">Top opportunity: ${escapeXml(top)}</text>
<text x="92" y="543" fill="#667069" font-family="system-ui,sans-serif" font-size="21">${escapeXml(scan.repository)} · local audit · ${escapeXml(evidence?.savings?.confidence ?? "unquantified")}</text>
</svg>`;
  await writeFile(path, svg, "utf8");
  return path;
}

