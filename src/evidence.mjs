import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function emptyEvidence() {
  return {
    schema_version: "lmab.evidence.v1",
    updated_at: new Date().toISOString(),
    sources: [],
    billing: {
      period: null,
      monthly_baseline_usd: null,
      requests_per_month: null,
      input_tokens: null,
      output_tokens: null,
      cache_read_input_tokens: null,
      cache_creation_input_tokens: null
    },
    savings: {
      monthly_low_usd: null,
      monthly_high_usd: null,
      percent_low: null,
      percent_high: null,
      confidence: "unknown",
      basis: null
    },
    notes: []
  };
}

export async function ensureEvidence(path) {
  try {
    await access(path);
  } catch {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(emptyEvidence(), null, 2)}\n`, "utf8");
  }
  return JSON.parse(await readFile(path, "utf8"));
}

