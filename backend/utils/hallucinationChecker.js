const { chunkText } = require("./textChunker");
const { extractJsonArray } = require("./llmGrammarChecker");
const { askGemini, askChatGPT } = require("./aiClients");

const CHUNK_SIZE = 15000;

function buildHallucinationPrompt(chunk) {
  return `You are helping a newsroom copy desk catch potential hallucinations — invented facts, fabricated quotes, made-up statistics, or self-contradictions — of the kind that sometimes slip into AI-drafted or AI-assisted copy.

Review the ARTICLE below and flag any passage that shows internal signs of being fabricated, unverifiable, or inconsistent. This is NOT a real-world fact-check against external sources — you have no way to browse or search — so only flag things based on internal red flags: suspiciously over-precise numbers with no clear attribution, quotes that don't fit how the speaker is described elsewhere in the piece, statements that contradict each other, or generic filler phrasing typical of AI generation.

Respond ONLY with a raw JSON array — no markdown fences, no commentary. Each element must look exactly like this:
{"text": "<exact verbatim passage from ARTICLE, a phrase or sentence>", "reason": "<one sentence explaining why this looks suspicious>", "category": "fabricated_statistic" | "invented_quote" | "unverifiable_claim" | "contradiction" | "generic_ai_phrasing" | "other", "confidence": "low" | "medium" | "high"}

Rules:
- "text" must be an exact, minimal, verbatim substring of ARTICLE.
- Don't flag ordinary factual reporting just because you personally can't verify it — focus on genuine internal red flags, not general skepticism.
- If nothing seems suspicious, respond with exactly: []

ARTICLE:
"""
${chunk}
"""`;
}

function mapItemsToFlags(items, chunk, chunkOffset) {
  const flags = [];
  let cursor = 0;

  for (const item of items) {
    if (!item || typeof item.text !== "string" || !item.text) continue;

    let idx = chunk.indexOf(item.text, cursor);
    if (idx === -1) idx = chunk.indexOf(item.text);
    if (idx === -1) continue; // couldn't verify this verbatim in the text — skip rather than guess a location

    flags.push({
      text: item.text,
      reason: item.reason || "Flagged as a possible hallucination.",
      category: item.category || "other",
      confidence: ["low", "medium", "high"].includes(item.confidence) ? item.confidence : "medium",
      offset: idx + chunkOffset,
      length: item.text.length,
    });

    cursor = idx + item.text.length;
  }

  return flags;
}

async function detectHallucinations(fullText, provider) {
  if (!fullText || !fullText.trim()) return [];

  const callModel = provider === "chatgpt" ? askChatGPTWrapped : askGeminiWrapped;
  const chunks = chunkText(fullText, CHUNK_SIZE);
  const allFlags = [];

  for (const chunk of chunks) {
    const rawText = await callModel(buildHallucinationPrompt(chunk.text));
    const items = extractJsonArray(rawText);
    allFlags.push(...mapItemsToFlags(items, chunk.text, chunk.start));
  }

  allFlags.sort((a, b) => a.offset - b.offset);
  return allFlags;
}

async function askGeminiWrapped(prompt) {
  return askGemini(prompt, { jsonMode: true });
}

async function askChatGPTWrapped(prompt) {
  const systemPrompt =
    'Respond only with a JSON object of the exact shape {"issues": [...]}. No markdown, no commentary.';
  const wrapped =
    prompt + '\n\nWrap that array in an object like this: {"issues": [ ...the array... ]}';
  const content = await askChatGPT(wrapped, { jsonMode: true, systemPrompt });

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.issues)) return JSON.stringify(parsed.issues);
    if (Array.isArray(parsed)) return content;
  } catch {
    // extractJsonArray will try a looser match too
  }
  return content;
}

module.exports = { detectHallucinations };
