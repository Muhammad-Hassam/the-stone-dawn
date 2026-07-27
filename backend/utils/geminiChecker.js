const axios = require("axios");
const { checkTextWithLLM, buildProofreadingPrompt } = require("./llmGrammarChecker");

const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();

if (GEMINI_API_KEY && !/^AIza[0-9A-Za-z_-]{35}$/.test(GEMINI_API_KEY)) {
  console.warn(
    "[geminiChecker] GEMINI_API_KEY doesn't look like a typical AI Studio key " +
      "(those start with 'AIzaSy' and are 39 characters). If AI checking fails, " +
      "double-check the key was copied from https://aistudio.google.com/apikey."
  );
}

async function callGemini(chunk) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured on the server — set it in backend/.env to use the Gemini checker"
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  let data;
  try {
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: buildProofreadingPrompt(chunk) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
      },
      { headers: { "Content-Type": "application/json" }, timeout: 60000 }
    );
    data = response.data;
  } catch (err) {
    // Surface Google's actual error message (invalid key, model not found,
    // API not enabled, quota exceeded, etc.) instead of a generic
    // "Request failed with status code 4xx" — this is what actually shows
    // up in the document's errorMessage, so it needs to be useful.
    const status = err.response?.status;
    const googleMessage = err.response?.data?.error?.message;
    console.error(`[geminiChecker] request failed (status ${status || "?"}):`, googleMessage || err.message);
    throw new Error(
      googleMessage
        ? `Gemini API error (${status}): ${googleMessage}`
        : `Gemini request failed: ${err.message}`
    );
  }

  if (!data?.candidates?.length) {
    const blockReason = data?.promptFeedback?.blockReason;
    console.error("[geminiChecker] Gemini returned no candidates:", JSON.stringify(data));
    if (blockReason) {
      throw new Error(
        `Gemini declined to process this content (${blockReason}). Try a different checker for this file instead.`
      );
    }
  }

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
}

function checkTextWithGemini(fullText) {
  return checkTextWithLLM(fullText, callGemini, "gemini-ai");
}

module.exports = { checkTextWithGemini };
