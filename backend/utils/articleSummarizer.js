const { askGemini, askChatGPT } = require("./aiClients");

// Summaries don't need per-mistake offsets, so no chunking/mapping needed —
// just cap how much text we send in one call to keep it fast and cheap.
const MAX_CHARS = 20000;

function buildSummaryPrompt(text) {
  return `Summarize the following newspaper article for an editor who hasn't read it yet.

Respond ONLY with a raw JSON object — no markdown fences, no commentary — of this exact shape:
{"summary": "<a tight 2-4 sentence summary>", "keyPoints": ["<key point 1>", "<key point 2>", "..."]}

Include at most 5 key points. If the text is too short or garbled to summarize meaningfully, respond with:
{"summary": "Not enough coherent text to summarize.", "keyPoints": []}

ARTICLE:
"""
${text.slice(0, MAX_CHARS)}
"""`;
}

function parseSummaryResponse(rawText) {
  try {
    const parsed = JSON.parse(rawText);
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.filter((k) => typeof k === "string") : [],
    };
  } catch {
    // Fall back to treating the whole raw response as the summary text,
    // rather than losing it entirely if the model didn't return clean JSON.
    return { summary: rawText.trim(), keyPoints: [] };
  }
}

async function summarizeArticle(fullText, provider) {
  if (!fullText || !fullText.trim()) {
    return { summary: "", keyPoints: [] };
  }

  const prompt = buildSummaryPrompt(fullText);

  if (provider === "chatgpt") {
    const systemPrompt = "Respond only with the requested JSON object. No markdown, no commentary.";
    const content = await askChatGPT(prompt, { jsonMode: true, systemPrompt });
    return parseSummaryResponse(content);
  }

  const content = await askGemini(prompt, { jsonMode: true });
  return parseSummaryResponse(content);
}

module.exports = { summarizeArticle };
