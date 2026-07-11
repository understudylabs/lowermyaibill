# Cache readiness

Read this when a route has cache, volatile-prefix, system-prompt, tool-schema, message-history, or cache-usage facts.

## Review

1. Open the cited route and locate the actual request boundary.
2. Separate stable tools and system instructions from per-request content.
3. Determine whether `cache_control` is absent, misplaced after volatile content, or attached to a stable prefix.
4. Check whether tools are generated, reordered, or conditionally included. Treat tool changes as a likely full-prefix invalidation risk.
5. Check timestamps, UUIDs, request IDs, random values, feature flags, and user content that appear before the breakpoint.
6. Check whether response usage records cache-read and cache-creation tokens. Configuration without usage handling is unmeasured.
7. For growing conversations, flag a possible lookback risk when many blocks are appended between stable breakpoints.
8. For parallel identical calls, flag a possible cold-start stampede; the first cache entry may not be available when siblings begin.

## Verdicts

- `ready`: stable prefix and cache marker are visible, with cache usage handling.
- `probably missing`: no marker or a volatile value appears before the likely breakpoint.
- `configured but unmeasured`: cache marker exists but usage handling is absent.
- `needs runtime validation`: wrappers or constructed prompts prevent a defensible static conclusion.

Never claim a cache-hit rate from code. Recommend measuring cache-read and cache-creation input tokens on the route.

Provider behavior changes. Verify exact TTL, lookback, minimum-token, and platform-support claims against current Anthropic prompt-caching documentation before presenting them as facts.
