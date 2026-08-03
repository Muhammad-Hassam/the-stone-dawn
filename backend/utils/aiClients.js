const axios = require("axios");

const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const OPENAI_MODEL = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();

if (GEMINI_API_KEY && !/^AIza[0-9A-Za-z_-]{35}$/.test(GEMINI_API_KEY)) {
  console.warn(
    "[aiClients] GEMINI_API_KEY doesn't look like a typical AI Studio key " +
      "(those start with 'AIzaSy' and are 39 characters). If AI features fail, " +
      "double-check the key was copied from https://aistudio.google.com/apikey."
  );
}
if (OPENAI_API_KEY && !/^sk-/.test(OPENAI_API_KEY)) {
  console.warn(
    "[aiClients] OPENAI_API_KEY doesn't look like a typical OpenAI key " +
      "(those start with 'sk-'). If AI features fail, double-check the key " +
      "was copied from https://platform.openai.com/api-keys."
  );
}

/**
 * Sends one prompt to Gemini and returns the raw text response.
 * `jsonMode` asks Gemini to only ever return valid JSON (used for anything
 * that expects a structured array/object back).
 */
async function askGemini(prompt, { jsonMode = false } = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured on the server — set it in backend/.env to use Gemini"
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  let data;
  try {
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      },
      { headers: { "Content-Type": "application/json" }, timeout: 60000 }
    );
    data = response.data;
  } catch (err) {
    const status = err.response?.status;
    const googleMessage = err.response?.data?.error?.message;
    console.error(`[aiClients] Gemini request failed (status ${status || "?"}):`, googleMessage || err.message);
    throw new Error(
      googleMessage ? `Gemini API error (${status}): ${googleMessage}` : `Gemini request failed: ${err.message}`
    );
  }

  if (!data?.candidates?.length) {
    const blockReason = data?.promptFeedback?.blockReason;
    console.error("[aiClients] Gemini returned no candidates:", JSON.stringify(data));
    if (blockReason) {
      throw new Error(`Gemini declined to process this content (${blockReason}).`);
    }
  }

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || (jsonMode ? "[]" : "");
}

/**
 * Sends one prompt to ChatGPT and returns the raw text response.
 * `jsonMode` uses OpenAI's JSON response format (which requires the
 * top-level response to be a JSON *object*, so callers should ask for an
 * object shape in their prompt, e.g. {"result": [...]}).
 */
async function askChatGPT(prompt, { jsonMode = false, systemPrompt } = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not configured on the server — set it in backend/.env to use ChatGPT"
    );
  }

  let data;
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: OPENAI_MODEL,
        temperature: 0.1,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, timeout: 60000 }
    );
    data = response.data;
  } catch (err) {
    const status = err.response?.status;
    const oaiMessage = err.response?.data?.error?.message;
    console.error(`[aiClients] OpenAI request failed (status ${status || "?"}):`, oaiMessage || err.message);
    throw new Error(
      oaiMessage ? `OpenAI API error (${status}): ${oaiMessage}` : `OpenAI request failed: ${err.message}`
    );
  }

  return data?.choices?.[0]?.message?.content || (jsonMode ? "{}" : "");
}

module.exports = { askGemini, askChatGPT };
