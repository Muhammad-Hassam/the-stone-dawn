/**
 * Standalone sanity check for every checker engine. Run this directly to
 * confirm each one is actually reachable and returning sensible results,
 * without needing to go through a full PDF upload first.
 *
 * Usage (from the backend/ folder):
 *   node scripts/testCheckers.js
 *   node scripts/testCheckers.js languagetool
 *   node scripts/testCheckers.js ai-gemini
 *   node scripts/testCheckers.js ai-chatgpt
 *   node scripts/testCheckers.js offline-spellcheck
 */
require("dotenv").config();

const SAMPLE_TEXT =
  "The comittee are meeting tommorow to discus the new policy, however " +
  "there going to need more time to finnish it's review before the desk " +
  "can publish this artical.";
// Deliberately packed with a spelling mistake ("comittee", "tommorow",
// "finnish", "artical"), a grammar mistake ("discus" as a verb, "there"
// instead of "they're", subject-verb agreement on "committee are"), and
// a punctuation mistake ("however" needs a semicolon/period before it,
// not a comma) — a good smoke test for all three categories.

const ENGINES = {
  languagetool: () => require("../utils/grammarChecker").checkText,
  "ai-gemini": () => require("../utils/geminiChecker").checkTextWithGemini,
  "ai-chatgpt": () => require("../utils/openaiChecker").checkTextWithChatGPT,
  "offline-spellcheck": () => require("../utils/offlineSpellChecker").checkTextOffline,
};

async function runOne(name) {
  console.log(`\n=== ${name} ===`);
  try {
    const checkFn = ENGINES[name]();
    const start = Date.now();
    const mistakes = await checkFn(SAMPLE_TEXT);
    const ms = Date.now() - start;

    if (!Array.isArray(mistakes)) {
      console.log(`✗ Did not return an array (got ${typeof mistakes})`);
      return;
    }
    if (mistakes.length === 0) {
      console.log(
        `⚠ Returned ZERO mistakes in ${ms}ms on text that should have several. ` +
          `Either the engine silently failed, or something about this sample slipped ` +
          `through — worth investigating before trusting it on real documents.`
      );
      return;
    }

    console.log(`✓ Found ${mistakes.length} mistake(s) in ${ms}ms:`);
    for (const m of mistakes) {
      console.log(
        `  [${m.category}] "${m.originalText}" -> "${m.appliedSuggestion || "(no suggestion)"}"  (${m.message})`
      );
    }
  } catch (err) {
    console.log(`✗ FAILED: ${err.message}`);
  }
}

async function main() {
  const requested = process.argv[2];
  const names = requested ? [requested] : Object.keys(ENGINES);

  for (const name of names) {
    if (!ENGINES[name]) {
      console.log(`Unknown engine "${name}". Options: ${Object.keys(ENGINES).join(", ")}`);
      continue;
    }
    await runOne(name);
  }

  console.log("\nDone.");
}

main();
