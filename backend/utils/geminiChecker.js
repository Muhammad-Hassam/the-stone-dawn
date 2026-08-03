const { checkTextWithLLM, buildProofreadingPrompt } = require("./llmGrammarChecker");
const { askGemini } = require("./aiClients");

async function callGemini(chunk) {
  return askGemini(buildProofreadingPrompt(chunk), { jsonMode: true });
}

function checkTextWithGemini(fullText) {
  return checkTextWithLLM(fullText, callGemini, "gemini-ai");
}

module.exports = { checkTextWithGemini };
