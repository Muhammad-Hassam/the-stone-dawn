const nspell = require("nspell");

// dictionary-en ships as ESM; dynamic import works fine from this
// CommonJS file. The loaded speller is cached at module scope so the
// dictionary is only parsed once per server process, not once per upload.
let spellerPromise = null;
function loadSpeller() {
  if (!spellerPromise) {
    spellerPromise = import("dictionary-en").then((mod) => nspell(mod.default));
  }
  return spellerPromise;
}

// Words: letters, plus internal apostrophes/hyphens (don't, well-known).
const WORD_PATTERN = /[A-Za-z][A-Za-z'’-]*/g;

/**
 * Pure dictionary lookup (Hunspell via nspell) — no API key, no network
 * call, works completely offline. Only catches spelling, since a plain
 * dictionary has no concept of grammar or punctuation; those counts will
 * always be zero for this engine.
 *
 * Known limitations (worth surfacing to users, not hiding): it will flag
 * proper nouns/names it doesn't recognize (e.g. "Kanwal"), and it's a US
 * English dictionary, so valid British spellings ("colour", "honour") get
 * flagged too. It's a fast, free, always-available option — not the most
 * accurate one.
 */
async function checkTextOffline(fullText) {
  if (!fullText || !fullText.trim()) return [];

  const spell = await loadSpeller();
  const mistakes = [];

  let match;
  WORD_PATTERN.lastIndex = 0;
  while ((match = WORD_PATTERN.exec(fullText)) !== null) {
    const word = match[0];
    if (word.length < 2) continue;
    if (spell.correct(word)) continue;

    const suggestions = spell.suggest(word).slice(0, 5);

    mistakes.push({
      message: `"${word}" was not found in the offline English dictionary.`,
      shortMessage: "SPELLING",
      offset: match.index,
      length: word.length,
      originalText: word,
      suggestions,
      appliedSuggestion: suggestions[0] || "",
      ruleId: "offline-hunspell",
      category: "SPELLING",
    });
  }

  return mistakes;
}

module.exports = { checkTextOffline };
