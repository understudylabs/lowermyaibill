import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ensureEvidence } from "./evidence.mjs";
import { writeReport } from "./report.mjs";
import { scanRepository } from "./scan.mjs";
import { writeShareCard } from "./share-card.mjs";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function runReport(repoPath) {
  const repo = resolve(repoPath);
  const directory = join(repo, ".lmab");
  const scanPath = join(directory, "scan.json");
  const evidencePath = join(directory, "evidence.json");
  let scan;
  try {
    scan = await readJson(scanPath);
  } catch {
    scan = (await scanRepository(repo)).scanData;
  }
  const evidence = await ensureEvidence(evidencePath);
  const report = await writeReport(join(directory, "report.html"), scan, evidence);
  const shareCard = await writeShareCard(join(directory, "share-card.svg"), scan, evidence);
  return { report, share_card: shareCard, evidence: evidencePath, scan: scanPath };
}

export async function runAudit(repoPath) {
  const scanned = await scanRepository(repoPath);
  const rendered = await runReport(repoPath);
  return {
    ...rendered,
    scan: scanned.scan,
    files_scanned: scanned.scanData.files_scanned,
    opportunities: scanned.scanData.opportunities.length,
  };
}
