# Batch eligibility

Read this when a route is near queue, cron, worker, backfill, or parallel-work markers.

## Review

- Confirm that the work is asynchronous and does not require an immediate user response.
- Look for labeling, classification, extraction, enrichment, evaluation, backfill, and scheduled jobs.
- Check whether a provider batch API is already used elsewhere in the route.
- Separate concurrency for latency from batching for offline throughput.
- Note retry, ordering, callback, and completion-window requirements that code does not establish.

Label the result `candidate` or `needs runtime validation`. Do not claim eligibility or savings until latency requirements and workload volume are known.
