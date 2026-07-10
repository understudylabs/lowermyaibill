---
name: audit
description: Audit a repository for the largest Anthropic or Claude cost-saving opportunities and write a local LMAB report. Use when someone asks to "lower my Anthropic bill", "lower my AI bill", inspect Claude usage, find prompt-cache failures, right-size Claude models, locate billing totals, or identify open-weight migration candidates.
---

# Lower My AI Bill Audit

Produce the best defensible local report available from code and already-connected billing evidence. Do not edit application code during the audit.

## Workflow

1. Resolve the repository root and the plugin root from `${CLAUDE_PLUGIN_ROOT}`.
2. Run the deterministic scan:

   ```sh
   node "$CLAUDE_PLUGIN_ROOT/bin/lmab" scan .
   ```

3. Read `.lmab/scan.json`. Inspect the cited call sites enough to reject false positives and understand shared wrappers, prompt construction, model selection, retry behavior, and workload shape.
4. Automatically use already-connected read-only integrations to seek Anthropic usage, invoice, receipt, and billing totals. Starting this audit is consent for this narrow evidence search. Respect any connector approval prompt.
5. Record normalized totals and source metadata in `.lmab/evidence.json`. Never copy message bodies, attachments, prompts, completions, source, account identifiers, or unrelated records into LMAB artifacts. Read [references/evidence.md](references/evidence.md) before writing evidence or savings ranges.
6. Rebuild the report and static share card:

   ```sh
   node "$CLAUDE_PLUGIN_ROOT/bin/lmab" report .
   ```

7. Open `.lmab/report.html` with the available local browser command. Summarize the top three opportunities, the evidence level, and the single best next measurement.

## Connected evidence search

Use available Gmail, Drive, file, or authenticated browser tools without a separate conversational confirmation when the scope is limited to Anthropic billing evidence.

- Gmail: search the last 12 months for messages from Anthropic containing `invoice`, `receipt`, `billing`, or `usage`.
- Drive: search for Anthropic usage exports, invoices, or billing summaries.
- Browser: inspect an already-authenticated Anthropic usage or billing page when available.
- Local files: look for likely usage exports without reading unrelated datasets.

Extract only provider, period, invoice or usage total, model, request count, token totals, and cache token fields. Do not send, modify, delete, upload, change billing settings, create keys, or call a model provider.

## Claim discipline

- Label direct code or billing facts `observed`.
- Label calculated ranges `estimated` and state their assumptions.
- Use `verified` only for measured baseline and candidate evidence.
- Do not manufacture a savings percentage from code alone.
- Keep overlapping opportunities out of the consolidated savings range.
- Stop at the report unless the user separately asks to implement a recommendation.

## Output

End with links to:

- `.lmab/report.html`
- `.lmab/evidence.json`
- `.lmab/scan.json`
- `.lmab/share-card.svg`

State which connected sources were searched, what was unavailable, and whether the savings headline is unquantified, estimated, or verified.

