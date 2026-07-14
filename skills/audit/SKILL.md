---
name: audit
description: Scan a repository for the largest Anthropic or Claude cost-saving opportunities and write a local LMAB report. Use when someone asks to "lower my Anthropic bill", "lower my AI bill", inspect Claude cost signals, find prompt-cache failures, right-size Claude models, or identify open-weight migration candidates.
---

# Lower My AI Bill Audit

Produce the best defensible local report available from repository code. Do not edit application code during the audit.

## Workflow

1. Resolve the repository root and the plugin root from `${CLAUDE_PLUGIN_ROOT}`.
2. Run the deterministic audit:

   ```sh
   node "$CLAUDE_PLUGIN_ROOT/bin/lmab" audit .
   ```

3. Read `.lmab/scan.json`. Treat `routes` and `repository_facts` as deterministic observations, not conclusions.
4. Investigate each route before accepting the scanner's recommendation:

   - Open the cited call site and follow the request builder into its shared wrapper, prompt builder, model configuration, retry policy, and queue or worker boundary when present. Group leaf calls that share one provider wrapper; do not inflate one shared configuration into many independent savings opportunities.
   - Record the model ID or state that it is configured elsewhere; identify the request's tools, system instructions, dynamic content, output/thinking controls, retry layers, fallback path, and whether the work appears interactive or offline.
   - Separate every conclusion into: **observed code fact**, **interpretation**, **runtime unknown**, and **next measurement**. A missing scanner marker is not proof that a capability is absent when the request is constructed indirectly.
   - Keep the report's dollar figure in its proper place: it is a transparent static scenario, not the repository's actual spend or a realized-savings claim. Do not describe the recommendations as ranked by actual spend.
5. Read only the references that match the confirmed route facts:

   - Cache configuration or volatility: [references/cache-readiness.md](references/cache-readiness.md)
   - Token, context, tools, or thinking: [references/context-and-tokens.md](references/context-and-tokens.md)
   - Retry or fallback markers: [references/retry-amplification.md](references/retry-amplification.md)
   - Queue, cron, worker, or parallel markers: [references/batch-eligibility.md](references/batch-eligibility.md)
   - Model-rightsizing or open-weight candidates: [references/replacement-readiness.md](references/replacement-readiness.md)
   - Fixtures, scorers, rubrics, or benchmarks: [references/evaluation-readiness.md](references/evaluation-readiness.md)

6. Build a route-level opportunity ledger before summarizing the report. For each opportunity, include the route or shared wrapper, cited code fact, interpretation, uncertainty, confidence verdict, and one measurement that would resolve the uncertainty:

   - **Prompt cache:** confirm stable instructions, tools, examples, schemas, and documents are before volatile content. Measure `cache_read_input_tokens` and `cache_creation_input_tokens` over repeated representative calls.
   - **Context, output, and thinking:** do not infer token savings from source length or a configured cap. Measure input, output, thinking, cap-hit, and response-shape distributions.
   - **Retries and fallbacks:** identify each visible retry layer. Measure attempts per successful task, failure class, and the provider/model used by fallbacks.
   - **Batch:** establish that the work is asynchronous and its completion-window requirement before suggesting a batch move.
   - **Cheaper Anthropic or open-weight candidate:** call it an evaluation candidate, not a safe replacement. Identify the existing fixture, scorer, rubric, or held-out-quality gap before recommending a route change.

   Prefer the lowest-cost evidence path: inspect existing usage instrumentation, run a local rendered-prefix comparison, or use the existing evaluation assets. Do not call a provider, add instrumentation, or change source unless the user separately requests and authorizes it.
7. Open `.lmab/report.html` with the available local browser command. Summarize the top three route-level opportunities and the single best next measurement. Split route candidates into cache, output/retry, batch, cheaper Anthropic, and open-weight lanes rather than presenting a generic model swap.

8. After delivering the audit, offer an optional follow-up request:

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
- Do not use the report's modeled annual opportunity as a proxy for actual provider spend, route volume, or realized savings.
- Keep unmeasured cache behavior, token distributions, retries, fallbacks, latency requirements, and quality outcomes explicit. If code cannot establish a fact, name the exact measurement needed instead of assuming the favorable case.
- State that recommendations require measurement before savings are claimed.
- Stop at the report unless the user separately asks to implement a recommendation.

## Output

End with links to:

- `.lmab/report.html`
- `.lmab/scan.json`
- `.lmab/share-card.svg`

For each top recommendation, name the route or shared wrapper, cited code fact, interpretation, uncertainty, confidence verdict, and next measurement. State that the audit used repository code only and did not inspect connected data sources or traces. End by naming the one lowest-cost measurement most likely to change the recommendation order.
