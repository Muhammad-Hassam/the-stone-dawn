const axios = require("axios");

const LT_API = process.env.LANGUAGETOOL_API;
const LT_LANG = process.env.LANGUAGETOOL_LANG;

// LanguageTool public API works best with chunks under ~15,000 chars per request
const CHUNK_SIZE = 12000;

function chunkText(text, size) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    // try to break on a paragraph/sentence boundary so offsets stay meaningful
    if (end < text.length) {
      const lastBreak = text.lastIndexOf("\n", end);
      if (lastBreak > start) end = lastBreak + 1;
    }
    chunks.push({ text: text.slice(start, end), start });
    start = end;
  }
  return chunks;
}

/**
 * Calls LanguageTool for a single chunk and normalizes matches.
 */
async function checkChunk(chunkText, chunkOffset) {
  const params = new URLSearchParams();
  params.append("text", chunkText);
  params.append("language", LT_LANG);

  const { data } = await axios.post(LT_API, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 30000,
  });

  const matches = data.matches || [];

  return matches.map((m) => {
    const offset = m.offset + chunkOffset;
    const length = m.length;
    const originalText = chunkText.substr(m.offset, m.length);
    const suggestions = (m.replacements || [])
      .slice(0, 5)
      .map((r) => r.value)
      .filter(Boolean);
    const category = m.rule && m.rule.category ? m.rule.category.id : "OTHER";

    return {
      message: m.message,
      shortMessage: m.shortMessage || "",
      offset,
      length,
      originalText,
      suggestions,
      appliedSuggestion: suggestions[0] || "",
      ruleId: m.rule ? m.rule.id : "",
      category,
    };
  });
}

/**
 * Checks full text for spelling/grammar mistakes.
 * Splits long text into chunks to respect API limits, and
 * offsets matches back to the position in the original full text.
 */
async function checkText(fullText) {
  if (!fullText || !fullText.trim()) return [];

  const chunks = chunkText(fullText, CHUNK_SIZE);
  const allMistakes = [];

  for (const chunk of chunks) {
    try {
      const mistakes = await checkChunk(chunk.text, chunk.start);
      allMistakes.push(...mistakes);
    } catch (err) {
      console.error("[grammarChecker] chunk check failed:", err.message);
      // continue with other chunks rather than failing the whole document
    }
  }

  // sort by position so downstream highlighting/correction is straightforward
  allMistakes.sort((a, b) => a.offset - b.offset);
  return allMistakes;
}

/**
 * Applies the top suggestion for each mistake to produce corrected text.
 * Mistakes must be sorted ascending by offset (checkText already sorts them).
 */
function applyCorrections(fullText, mistakes) {
  let corrected = "";
  let cursor = 0;

  for (const m of mistakes) {
    if (m.offset < cursor) continue; // skip overlapping matches
    corrected += fullText.slice(cursor, m.offset);
    corrected += m.appliedSuggestion || m.originalText;
    cursor = m.offset + m.length;
  }
  corrected += fullText.slice(cursor);
  return corrected;
}

module.exports = { checkText, applyCorrections };
