# Retry amplification

Read this when a route has retry or fallback facts.

## Review

- Identify SDK, transport, queue, application, parser, and workflow retry layers.
- Check whether one failure can trigger retries at more than one layer.
- Distinguish rate-limit or transient retries from semantic retries caused by parsing or validation.
- Check retry ceilings, backoff, jitter, and whether premium-model fallback happens after every failure.
- Check whether partial successes are discarded and recomputed.
- Treat fallback-model use as a route decision, not proof that the fallback is cheaper or better.

Report the visible retry layers and the missing runtime measurement. Recommend counting attempts per successful task before claiming amplification.
