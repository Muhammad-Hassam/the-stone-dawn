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
 *   node scripts/testCheckers.js hallucination-gemini
 *   node scripts/testCheckers.js hallucination-chatgpt
 *   node scripts/testCheckers.js sensitive-gemini
 *   node scripts/testCheckers.js sensitive-chatgpt
 *   node scripts/testCheckers.js summary-gemini
 *   node scripts/testCheckers.js summary-chatgpt
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

const HALLUCINATION_SAMPLE =
  "The mayor said the bridge repair would cost exactly $4,827,193.42, a figure " +
  "he described as 'the most precise number our department has ever produced.' " +
  "Later in the same statement, he said the department had not yet finished " +
  "estimating the cost. City officials could not be reached for comment, " +
  "though Deputy Commissioner Angela Ruiz was quoted at length praising the " +
  "plan in a press release issued the same afternoon.";

const SENSITIVE_SAMPLE =
  "The 14-year-old victim, whose name we are withholding, can be reached at " +
  "her home phone number 555-0134 for further comment. Police described the " +
  "attack in graphic detail, including the exact sequence of injuries " +
  "inflicted. A neighbor, who was not charged with any crime, is 'obviously " +
  "guilty and should be locked up forever,' according to one resident.";

async function runSensitive(provider) {
  console.log(`\n=== sensitive content check (${provider}) ===`);
  try {
    const { detectSensitiveContent } = require("../utils/sensitiveContentChecker");
    const start = Date.now();
    const flags = await detectSensitiveContent(SENSITIVE_SAMPLE, provider);
    const ms = Date.now() - start;
    console.log(`✓ Found ${flags.length} flag(s) in ${ms}ms:`);
    for (const f of flags) {
      console.log(`  [${f.category}/${f.severity}] "${f.text}" — ${f.reason}`);
    }
  } catch (err) {
    console.log(`✗ FAILED: ${err.message}`);
  }
}

async function runHallucination(provider) {
  console.log(`\n=== hallucination check (${provider}) ===`);
  try {
    const { detectHallucinations } = require("../utils/hallucinationChecker");
    const start = Date.now();
    const flags = await detectHallucinations(HALLUCINATION_SAMPLE, provider);
    const ms = Date.now() - start;
    console.log(`✓ Found ${flags.length} flag(s) in ${ms}ms:`);
    for (const f of flags) {
      console.log(`  [${f.category}/${f.confidence}] "${f.text}" — ${f.reason}`);
    }
  } catch (err) {
    console.log(`✗ FAILED: ${err.message}`);
  }
}

async function runSummary(provider) {
  console.log(`\n=== article summary (${provider}) ===`);
  try {
    const { summarizeArticle } = require("../utils/articleSummarizer");
    const start = Date.now();
    const result = await summarizeArticle(SAMPLE_TEXT, provider);
    const ms = Date.now() - start;
    console.log(`✓ Summarized in ${ms}ms:`);
    console.log(`  Summary: ${result.summary}`);
    console.log(`  Key points: ${result.keyPoints.join(" | ") || "(none)"}`);
  } catch (err) {
    console.log(`✗ FAILED: ${err.message}`);
  }
}

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

  if (requested === "hallucination-gemini") return runHallucination("gemini");
  if (requested === "hallucination-chatgpt") return runHallucination("chatgpt");
  if (requested === "sensitive-gemini") return runSensitive("gemini");
  if (requested === "sensitive-chatgpt") return runSensitive("chatgpt");
  if (requested === "summary-gemini") return runSummary("gemini");
  if (requested === "summary-chatgpt") return runSummary("chatgpt");

  for (const name of names) {
    if (!ENGINES[name]) {
      console.log(`Unknown engine "${name}". Options: ${Object.keys(ENGINES).join(", ")}, hallucination-gemini, hallucination-chatgpt, sensitive-gemini, sensitive-chatgpt, summary-gemini, summary-chatgpt`);
      continue;
    }
    await runOne(name);
  }

  console.log("\nDone.");
}

main();
