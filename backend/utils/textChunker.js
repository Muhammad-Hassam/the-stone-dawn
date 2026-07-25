/**
 * Splits long text into chunks that stay under a checker's request-size
 * limit, breaking on line boundaries where possible so offsets stay easy
 * to reason about. Returns [{ text, start }] where `start` is the chunk's
 * offset into the original full text.
 */
function chunkText(text, size) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
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
 * Normalizes a raw category label (from LanguageTool's rule category id,
 * or anything else) into one of the three buckets the UI cares about:
 * SPELLING, GRAMMAR, PUNCTUATION — or OTHER if it doesn't clearly fit.
 */
function normalizeCategory(rawCategory) {
  const id = (rawCategory || "").toUpperCase();
  if (id.includes("TYPO") || id.includes("SPELL") || id.includes("MORFOLOGIK")) return "SPELLING";
  if (id.includes("PUNCT")) return "PUNCTUATION";
  if (
    id.includes("GRAMMAR") ||
    id.includes("CONFUSED") ||
    id.includes("CASING") ||
    id.includes("COMPOUND") ||
    id.includes("REDUNDAN") ||
    id.includes("COLLOCATION") ||
    id.includes("AGREEMENT") ||
    id.includes("VERB") ||
    id.includes("TYPOGRAPHY")
  ) {
    return "GRAMMAR";
  }
  return "OTHER";
}

module.exports = { chunkText, normalizeCategory };
