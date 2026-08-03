const mongoose = require("mongoose");

const BoxSchema = new mongoose.Schema(
  {
    page: { type: Number, required: true },
    box: { type: [Number], required: true }, // [left, top, right, bottom] in scale-1 viewport space
  },
  { _id: false }
);

const MistakeSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    shortMessage: { type: String, default: "" },
    offset: { type: Number, required: true }, // char offset in extracted text
    length: { type: Number, required: true }, // length of the mistake span
    originalText: { type: String, required: true }, // the exact wrong text
    suggestions: { type: [String], default: [] }, // replacement suggestions
    appliedSuggestion: { type: String, default: "" }, // suggestion used for auto-correction
    ruleId: { type: String, default: "" },
    category: { type: String, default: "" }, // e.g. "SPELLING", "GRAMMAR", "TYPOS"
    boxes: { type: [BoxSchema], default: [] }, // where this mistake appears on the actual PDF page(s)
  },
  { _id: false }
);

const PageSchema = new mongoose.Schema(
  {
    pageNumber: { type: Number, required: true },
    width: { type: Number, required: true }, // at scale 1
    height: { type: Number, required: true },
  },
  { _id: false }
);

const HallucinationFlagSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    reason: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "fabricated_statistic",
        "invented_quote",
        "unverifiable_claim",
        "contradiction",
        "generic_ai_phrasing",
        "other",
      ],
      default: "other",
    },
    confidence: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    offset: { type: Number, required: true },
    length: { type: Number, required: true },
    boxes: { type: [BoxSchema], default: [] },
  },
  { _id: false }
);

const SensitiveFlagSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    reason: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "graphic_violence",
        "hate_speech",
        "personal_identifiable_info",
        "vulnerable_individual",
        "self_harm_detail",
        "profanity",
        "unverified_accusation",
        "other",
      ],
      default: "other",
    },
    severity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    offset: { type: Number, required: true },
    length: { type: Number, required: true },
    boxes: { type: [BoxSchema], default: [] },
  },
  { _id: false }
);

const PdfDocumentSchema = new mongoose.Schema(
  {
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    originalName: { type: String, required: true },
    storedName: { type: String, required: true }, // filename on disk
    originalPath: { type: String, required: true }, // path saved in DB (relative to uploads dir)
    correctedFileName: { type: String, default: "" },
    correctedPath: { type: String, default: "" }, // path to generated corrected PDF
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: "application/pdf" },

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    errorMessage: { type: String, default: "" },

    extractedText: { type: String, default: "" },
    correctedText: { type: String, default: "" },

    mistakes: { type: [MistakeSchema], default: [] },
    mistakeCount: { type: Number, default: 0 },
    spellingCount: { type: Number, default: 0 },
    grammarCount: { type: Number, default: 0 },
    punctuationCount: { type: Number, default: 0 },
    otherCount: { type: Number, default: 0 },

    checkerEngine: {
      type: String,
      enum: ["languagetool", "ai-gemini", "ai-chatgpt", "offline-spellcheck"],
      default: "languagetool",
    },

    pageCount: { type: Number, default: 0 },
    pages: { type: [PageSchema], default: [] }, // per-page width/height at scale 1, for the PDF viewer overlay

    // --- Optional AI extras (independent of which proofreading engine ran) ---
    hallucinationCheckRequested: { type: Boolean, default: false },
    hallucinationFlags: { type: [HallucinationFlagSchema], default: [] },
    hallucinationCount: { type: Number, default: 0 },

    summaryRequested: { type: Boolean, default: false },
    summary: { type: String, default: "" },
    summaryKeyPoints: { type: [String], default: [] },

    sensitiveCheckRequested: { type: Boolean, default: false },
    sensitiveFlags: { type: [SensitiveFlagSchema], default: [] },
    sensitiveFlagCount: { type: Number, default: 0 },

    aiExtrasProvider: { type: String, enum: ["gemini", "chatgpt", ""], default: "" },
    aiExtrasError: { type: String, default: "" },
  },
  { timestamps: true } // adds createdAt / updatedAt -> acts as our "history" log
);

PdfDocumentSchema.index({ createdAt: -1 });
PdfDocumentSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model("PdfDocument", PdfDocumentSchema);
