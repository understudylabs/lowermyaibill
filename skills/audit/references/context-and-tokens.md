# Context and token controls

Read this when a route has output-cap, thinking, tool-schema, system-prompt, structured-output, or message-history facts.

## Review

- Compare configured output limits with the response shape. A small enum or JSON object with a very large cap is a measurement candidate.
- Look for extended thinking applied globally instead of to difficult branches.
- Check whether every route receives all tool definitions, even when most tools are irrelevant.
- Check for repeated insertion of large documents, examples, schemas, or policy text.
- Check whether conversation histories grow without compaction, summarization, or a bounded window.
- Look for duplicated system prompts or schemas across wrappers that could be centralized into a stable route envelope.

Do not estimate token savings from literal character counts. Recommend measuring input, output, thinking, and cap-hit distributions before setting a production limit.
