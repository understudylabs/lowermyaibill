# Evidence and Savings Rules

Use this reference before editing `.lmab/evidence.json`.

## Evidence shape

Keep the existing `lmab.evidence.v1` structure. Add source rows using:

```json
{
  "type": "gmail|drive|browser|file|manual",
  "provider": "anthropic",
  "period": "2026-06",
  "status": "observed",
  "fields": ["invoice_total_usd", "input_tokens"],
  "query": "bounded query or page class",
  "notes": "No identifying or raw content"
}
```

Do not store message IDs, invoice IDs, account IDs, company names, domains, people, repository paths, URLs with account identifiers, or document bodies.

## Billing fields

Populate fields only when observed:

- `period`
- `monthly_baseline_usd`
- `requests_per_month`
- `input_tokens`
- `output_tokens`
- `cache_read_input_tokens`
- `cache_creation_input_tokens`

Use `null`, not zero, for missing values.

## Savings range

Populate `savings` only after building a consolidated, non-overlapping scenario:

- `monthly_low_usd`
- `monthly_high_usd`
- `percent_low`
- `percent_high`
- `confidence`: `low`, `medium`, `high`, or `verified`
- `basis`: one sentence naming the inputs and assumptions

Do not sum model-rightsizing, caching, and batching estimates when they address the same spend. Use the most conservative consolidated range. Recheck current provider pricing before using rates; do not rely on rates embedded in repository documentation.

## Search boundaries

The audit invocation authorizes narrow read-only searches of already-connected integrations for Anthropic billing evidence. It does not authorize writes, broad mailbox or drive exploration, source upload, provider calls, plan changes, or public sharing.

