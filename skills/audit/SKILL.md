---
name: audit
description: Scan a repository for the largest Anthropic or Claude cost-saving opportunities and write a local LMAB report. Use when someone asks to "lower my Anthropic bill", "lower my AI bill", inspect Claude usage, find prompt-cache failures, right-size Claude models, or identify open-weight migration candidates.
---

# Lower My AI Bill Audit

Produce the best defensible local report available from repository code. Do not edit application code during the audit.

## Workflow

1. Resolve the repository root and the plugin root from `${CLAUDE_PLUGIN_ROOT}`.
2. Run the deterministic audit:

   ```sh
   node "$CLAUDE_PLUGIN_ROOT/bin/lmab" audit .
   ```

3. Read `.lmab/scan.json`. Inspect the cited call sites enough to reject false positives and understand shared wrappers, prompt construction, model selection, retry behavior, and workload shape.
4. Open `.lmab/report.html` with the available local browser command. Summarize the top three opportunities and the single best next measurement.

Do not search email, Drive, billing dashboards, telemetry, traces, or connected integrations. Do not call provider APIs or ask for credentials. This product is a codebase scanner.

## Claim discipline

- Treat direct code signals as observed static findings.
- Do not manufacture a savings percentage from code alone.
- State that recommendations require measurement before savings are claimed.
- Stop at the report unless the user separately asks to implement a recommendation.

## Output

End with links to:

- `.lmab/report.html`
- `.lmab/scan.json`
- `.lmab/share-card.svg`

State that the audit used repository code only and did not inspect connected data sources or traces.
