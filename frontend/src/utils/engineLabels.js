const ENGINE_LABELS = {
  languagetool: "LanguageTool",
  "ai-gemini": "AI (Gemini)",
  "ai-chatgpt": "AI (ChatGPT)",
  "offline-spellcheck": "Offline Dictionary",
};

export function engineLabel(engine) {
  return ENGINE_LABELS[engine] || "LanguageTool";
}
