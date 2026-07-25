const { chunkText } = require("./textChunker");

// LLMs have much larger context windows than LanguageTool's public API, but
// we still chunk very long documents to keep each response small enough to
// parse reliably and to bound how much a single failed call can lose.
const CHUNK_SIZE = 15000;

function buildProofreadingPrompt(chunk) {
  return `You are a meticulous professional proofreader. Carefully review the TEXT below and find every spelling mistake, grammar mistake, and punctuation mistake.

Respond ONLY with a raw JSON array — no markdown code fences, no commentary, no extra text before or after. Each element must look exactly like this:
{"original": "<the exact wrong word or short phrase, copied verbatim from TEXT>", "suggestion": "<the corrected replacement text>", "type": "spelling" | "grammar" | "punctuation", "explanation": "<one short sentence explaining the issue>"}

Rules:
- "original" must be an exact, minimal, verbatim substring of TEXT — not a paraphrase, not a longer sentence than necessary.
- Only flag genuine errors — do not flag subjective style or wording preferences.
- List issues in the order they appear in TEXT.
- If there are no errors, respond with exactly: []

TEXT:
"""
${chunk}
"""`;
}

function extractJsonArray(rawText) {
  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through to a looser extraction below
  }
  const match = (rawText || "").match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // give up — treat as no findings rather than crash the upload
    }
  }
  return [];
}

/**
 * Maps the model's {original, suggestion, type, explanation} items back onto
 * verbatim offsets in `chunk`, in the same {offset, length, category, ...}
 * shape the LanguageTool checker produces, so the rest of the pipeline
 * (box-pinning, corrected-PDF generation, count tallying) doesn't care which
 * engine ran.
 */
function mapItemsToMistakes(items, chunk, chunkOffset, ruleId) {
  const mistakes = [];
  let cursor = 0;

  for (const item of items) {
    if (!item || typeof item.original !== "string" || !item.original) continue;

    // Search forward from where the last match ended (findings should arrive
    // in text order per the prompt); fall back to a from-the-start search
    // since the model won't always get ordering perfectly right.
    let idx = chunk.indexOf(item.original, cursor);
    if (idx === -1) idx = chunk.indexOf(item.original);
    if (idx === -1) continue; // couldn't verify this verbatim in the text — skip rather than guess a location

    const type = (item.type || "").toLowerCase();
    const category =
      type === "spelling" ? "SPELLING" : type === "punctuation" ? "PUNCTUATION" : "GRAMMAR";

    mistakes.push({
      message: item.explanation || "Possible issue flagged by AI review",
      shortMessage: category,
      offset: idx + chunkOffset,
      length: item.original.length,
      originalText: item.original,
      suggestions: item.suggestion ? [item.suggestion] : [],
      appliedSuggestion: item.suggestion || "",
      ruleId,
      category,
    });

    cursor = idx + item.original.length;
  }

  return mistakes;
}

/**
 * Generic driver: chunks the text, calls `callModel(chunkText) => rawText`
 * for each chunk, parses the JSON findings, and maps them to mistakes.
 * Each provider (Gemini, ChatGPT, ...) only has to implement `callModel`.
 */
async function checkTextWithLLM(fullText, callModel, ruleId) {
  if (!fullText || !fullText.trim()) return [];

  const chunks = chunkText(fullText, CHUNK_SIZE);
  const allMistakes = [];

  for (const chunk of chunks) {
    const rawText = await callModel(chunk.text);
    const items = extractJsonArray(rawText);
    allMistakes.push(...mapItemsToMistakes(items, chunk.text, chunk.start, ruleId));
  }

  allMistakes.sort((a, b) => a.offset - b.offset);
  return allMistakes;
}

module.exports = { checkTextWithLLM, buildProofreadingPrompt };
