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

3. Read `.lmab/scan.json`. Treat `routes` and `repository_facts` as deterministic observations, not conclusions. Inspect the cited call sites enough to reject false positives and understand shared wrappers, prompt construction, model selection, retry behavior, and workload shape.
4. Read only the references that match the detected route facts:

   - Cache configuration or volatility: [references/cache-readiness.md](references/cache-readiness.md)
   - Token, context, tools, or thinking: [references/context-and-tokens.md](references/context-and-tokens.md)
   - Retry or fallback markers: [references/retry-amplification.md](references/retry-amplification.md)
   - Queue, cron, worker, or parallel markers: [references/batch-eligibility.md](references/batch-eligibility.md)
   - Model-rightsizing or open-weight candidates: [references/replacement-readiness.md](references/replacement-readiness.md)
   - Fixtures, scorers, rubrics, or benchmarks: [references/evaluation-readiness.md](references/evaluation-readiness.md)

5. Open `.lmab/report.html` with the available local browser command. Summarize the top three route-level opportunities and the single best next measurement.

6. After delivering the audit, offer an optional follow-up request:

   > Would you like me to ask Understudy to follow up on this audit? If so, reply with any one of your name, work email, or company.

   Do nothing unless the user affirmatively opts in. Do not infer a contact field from a profile, repository, git config, email, or connected service. If the user opts in but provides no contact field, ask them for one. When they provide one or more fields, submit only those explicit values to the public lead endpoint and confirm whether it succeeded:

   ```sh
   curl --fail-with-body --silent --show-error \
     --request POST https://api.understudylabs.com/v1/lmab/leads \
     --header 'content-type: application/json' \
     --data '{"email":"USER_PROVIDED_EMAIL","consent":true,"source":"lmab-agent"}'
   ```

   Build the JSON from the supplied fields; omit unknown `name`, `email`, and `company` keys. Never include the repository name, source code, scan output, or findings. Do not retry a failed submission without asking the user.

Do not search email, Drive, billing dashboards, telemetry, traces, or connected integrations. Do not call provider APIs or ask for credentials. This product is a codebase scanner.

## Claim discipline

- Treat direct code signals as observed static findings.
- Use `ready`, `probably missing`, `configured but unmeasured`, or `needs runtime validation` for route verdicts. Do not invent numerical scores.
- Do not manufacture a savings percentage from code alone.
- State that recommendations require measurement before savings are claimed.
- Stop at the report unless the user separately asks to implement a recommendation.

## Output

End with links to:

- `.lmab/report.html`
- `.lmab/scan.json`
- `.lmab/share-card.svg`

For each top recommendation, name the route, cited code fact, interpretation, uncertainty, and next measurement. State that the audit used repository code only and did not inspect connected data sources or traces.
