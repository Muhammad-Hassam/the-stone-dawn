const axios = require("axios");
const { checkTextWithLLM, buildProofreadingPrompt } = require("./llmGrammarChecker");

// Model naming changes over time — check https://platform.openai.com/docs/models
// for the current list if the default below stops working.
const OPENAI_MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();

if (OPENAI_API_KEY && !/^sk-/.test(OPENAI_API_KEY)) {
  console.warn(
    "[openaiChecker] OPENAI_API_KEY doesn't look like a typical OpenAI key " +
      "(those start with 'sk-'). If AI checking fails, double-check the key " +
      "was copied from https://platform.openai.com/api-keys."
  );
}

async function callChatGPT(chunk) {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not configured on the server — set it in backend/.env to use the ChatGPT checker"
    );
  }

  let data;
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: OPENAI_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are a meticulous proofreader that only ever responds with a JSON object of the exact shape {"issues": [...]}. Never include markdown fences or commentary.',
          },
          {
            role: "user",
            // The shared prompt asks for a bare JSON array; wrap the
            // instruction slightly since this endpoint's JSON mode requires
            // the top-level response to be a JSON *object*, not an array.
            content:
              buildProofreadingPrompt(chunk) +
              '\n\nWrap that array in an object like this: {"issues": [ ...the array... ]}',
          },
        ],
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, timeout: 60000 }
    );
    data = response.data;
  } catch (err) {
    // Surface OpenAI's actual error message (invalid key, model not found,
    // insufficient quota, etc.) instead of a generic axios status error.
    const status = err.response?.status;
    const oaiMessage = err.response?.data?.error?.message;
    console.error(`[openaiChecker] request failed (status ${status || "?"}):`, oaiMessage || err.message);
    throw new Error(
      oaiMessage
        ? `OpenAI API error (${status}): ${oaiMessage}`
        : `OpenAI request failed: ${err.message}`
    );
  }

  const content = data?.choices?.[0]?.message?.content || "{}";

  // callGemini-style contract expects a raw string containing a JSON array
  // somewhere in it; unwrap the {"issues": [...]}" object back into that.
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
