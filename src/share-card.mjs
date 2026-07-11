import { writeFile } from "node:fs/promises";

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;",
  })[character]);
}

function cardResult(scan) {
  return { value: String(scan.opportunities.length), label: "cost-saving opportunities found" };
}

export async function writeShareCard(path, scan) {
  const result = cardResult(scan);
  const top = scan.opportunities[0]?.title ?? "Anthropic spend audit complete";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#000"/><rect x="48" y="48" width="1104" height="534" rx="12" fill="#030303" stroke="#242424"/>
<rect x="1110" y="78" width="10" height="10" fill="#d97757"/>
<text x="88" y="104" fill="#e8e8e5" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="18" font-weight="500" letter-spacing="4">LOWER MY AI BILL · LOCAL AUDIT</text>
<text x="88" y="168" fill="#686866" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="15" letter-spacing="2">01 · ADDRESSABLE SPEND</text>
<text x="88" y="330" fill="#d97757" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="104" font-weight="500" letter-spacing="-5">${escapeXml(result.value)}</text>
<text x="92" y="378" fill="#a2a29f" font-family="system-ui,sans-serif" font-size="25">${escapeXml(result.label)}</text>
<line x1="88" y1="444" x2="1112" y2="444" stroke="#242424"/>
<rect x="88" y="486" width="38" height="28" rx="4" fill="none" stroke="#343434"/><text x="99" y="505" fill="#9b9b98" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12">02</text>
<text x="148" y="507" fill="#e8e8e5" font-family="system-ui,sans-serif" font-size="23">${escapeXml(top)}</text>
<text x="88" y="552" fill="#686866" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="14" letter-spacing="1">${escapeXml(scan.repository)} · LOCAL CODE SCAN · STATIC ANALYSIS</text>
</svg>`;
  await writeFile(path, svg, "utf8");
  return path;
}
