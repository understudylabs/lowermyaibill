# Evaluation readiness

Read this when `repository_facts.evaluation_files` contains fixtures, benchmarks, rubrics, scorers, or golden data.

## Review

1. Open only the relevant supporting files.
2. Determine whether they contain inputs, expected outputs, executable scorers, human labels, or snapshots.
3. Check whether examples cover the same route and response contract as the detected call site.
4. Separate deterministic validation from subjective quality review.
5. Note whether the files appear synthetic, stale, or production-representative.

Use `evaluation assets present`, `partial evaluation assets`, or `no evaluation assets found`. Do not claim benchmark readiness from filenames alone.

When useful assets exist, make the next step concrete: freeze a held-out split, record the frontier baseline, and compare a cheaper route against the same quality bar.
