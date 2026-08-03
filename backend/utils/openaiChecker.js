const { checkTextWithLLM, buildProofreadingPrompt } = require("./llmGrammarChecker");
const { askChatGPT } = require("./aiClients");

const JSON_OBJECT_SYSTEM_PROMPT =
  'You are a meticulous proofreader that only ever responds with a JSON object of the exact shape {"issues": [...]}. Never include markdown fences or commentary.';

async function callChatGPT(chunk) {
  // The shared prompt asks for a bare JSON array; wrap the instruction
  // slightly since OpenAI's JSON mode requires a top-level JSON *object*.
  const prompt =
    buildProofreadingPrompt(chunk) +
    '\n\nWrap that array in an object like this: {"issues": [ ...the array... ]}';

  const content = await askChatGPT(prompt, { jsonMode: true, systemPrompt: JSON_OBJECT_SYSTEM_PROMPT });

  // checkTextWithLLM expects a raw string containing a JSON array somewhere
  // in it; unwrap the {"issues": [...]} object back into that.
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.issues)) return JSON.stringify(parsed.issues);
    if (Array.isArray(parsed)) return content;
  } catch {
    // fall through — checkTextWithLLM's extractJsonArray will try a looser match too
  }
  return content;
}

function checkTextWithChatGPT(fullText) {
  return checkTextWithLLM(fullText, callChatGPT, "chatgpt-ai");
}

module.exports = { checkTextWithChatGPT };
