# Replacement readiness

Read this for premium-model routes or open-weight evaluation recommendations.

## Favorable code signals

- Narrow classification, extraction, routing, labeling, or transformation work
- Structured outputs with deterministic validation
- A shared model-client abstraction or configurable model identifier
- Limited tool complexity
- Fixtures, expected outputs, rubrics, or scorers
- Batchable or repeated workflow structure

## Caution signals

- Open-ended agentic work with changing tool actions
- Multimodal or very long-context requirements
- Frontier-specific reasoning or safety behavior
- No representative examples or quality gate
- Model choice embedded across many call sites

Call a route an `evaluation candidate`, never a safe replacement. The Understudy handoff is to capture representative work, freeze a quality bar, compare routes head-to-head, and promote only a winner.
