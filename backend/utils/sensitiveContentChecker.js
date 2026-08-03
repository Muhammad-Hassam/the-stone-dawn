const { chunkText } = require("./textChunker");
const { extractJsonArray } = require("./llmGrammarChecker");
const { askGemini, askChatGPT } = require("./aiClients");

const CHUNK_SIZE = 15000;

function buildSensitiveContentPrompt(chunk) {
  return `You are helping a newsroom copy desk flag potentially sensitive content that may need editorial review, redaction, or a second opinion before publication.

Review the ARTICLE below and flag any passage that falls into one of these categories:
- graphic_violence: explicit or gratuitously graphic descriptions of violence, injury, or death
- hate_speech: discriminatory, dehumanizing, or slur-based language targeting a group
- personal_identifiable_info: phone numbers, home addresses, ID/CNIC/SSN numbers, or other private identifying details that don't need to be public
- vulnerable_individual: identifying details about a minor, a sexual assault survivor, or another person typically protected by standard reporting guidelines
- self_harm_detail: specific method or means details that violate safe-reporting guidelines for suicide or self-harm
- profanity: vulgar or offensive language
- unverified_accusation: a serious allegation stated as settled fact without clear attribution or sourcing, carrying legal/defamation risk

Respond ONLY with a raw JSON array — no markdown fences, no commentary. Each element must look exactly like this:
{"text": "<exact verbatim passage from ARTICLE>", "category": "graphic_violence" | "hate_speech" | "personal_identifiable_info" | "vulnerable_individual" | "self_harm_detail" | "profanity" | "unverified_accusation" | "other", "severity": "low" | "medium" | "high", "reason": "<one sentence explaining the concern>"}

Rules:
- "text" must be an exact, minimal, verbatim substring of ARTICLE.
- Only flag genuine editorial concerns — routine, responsibly-reported coverage of difficult topics (e.g. a crime report that names a charged adult, or a battle report using standard military terms) is NOT itself sensitive; focus on the categories above.
- If nothing needs review, respond with exactly: []

ARTICLE:
"""
${chunk}
"""`;
}

function mapItemsToFlags(items, chunk, chunkOffset) {
  const flags = [];
  let cursor = 0;

  for (const item of items) {
    if (!item || typeof item.text !== "string" || !item.text) continue;

    let idx = chunk.indexOf(item.text, cursor);
    if (idx === -1) idx = chunk.indexOf(item.text);
    if (idx === -1) continue; // couldn't verify this verbatim in the text — skip rather than guess a location

    flags.push({
      text: item.text,
      reason: item.reason || "Flagged for editorial review.",
      category: item.category || "other",
      severity: ["low", "medium", "high"].includes(item.severity) ? item.severity : "medium",
      offset: idx + chunkOffset,
      length: item.text.length,
    });

    cursor = idx + item.text.length;
  }

  return flags;
}

async function askGeminiWrapped(prompt) {
  return askGemini(prompt, { jsonMode: true });
}

async function askChatGPTWrapped(prompt) {
  const systemPrompt =
    'Respond only with a JSON object of the exact shape {"issues": [...]}. No markdown, no commentary.';
  const wrapped =
    prompt + '\n\nWrap that array in an object like this: {"issues": [ ...the array... ]}';
  const content = await askChatGPT(wrapped, { jsonMode: true, systemPrompt });

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.issues)) return JSON.stringify(parsed.issues);
    if (Array.isArray(parsed)) return content;
  } catch {
    // extractJsonArray will try a looser match too
  }
  return content;
}

async function detectSensitiveContent(fullText, provider) {
  if (!fullText || !fullText.trim()) return [];

  const callModel = provider === "chatgpt" ? askChatGPTWrapped : askGeminiWrapped;
  const chunks = chunkText(fullText, CHUNK_SIZE);
  const allFlags = [];

  for (const chunk of chunks) {
    const rawText = await callModel(buildSensitiveContentPrompt(chunk.text));
    const items = extractJsonArray(rawText);
    allFlags.push(...mapItemsToFlags(items, chunk.text, chunk.start));
  }

  allFlags.sort((a, b) => a.offset - b.offset);
  return allFlags;
}

module.exports = { detectSensitiveContent };
