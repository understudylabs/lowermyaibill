import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function summarize(items: string[]) {
  return Promise.all(items.map((item) => client.messages.create({
    model: "claude-opus-4-1",
    max_tokens: 8192,
    messages: [{ role: "user", content: `${Date.now()}: summarize ${item}` }],
  })));
}

