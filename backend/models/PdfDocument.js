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

    pageCount: { type: Number, default: 0 },
    pages: { type: [PageSchema], default: [] }, // per-page width/height at scale 1, for the PDF viewer overlay
  },
  { timestamps: true } // adds createdAt / updatedAt -> acts as our "history" log
);

PdfDocumentSchema.index({ createdAt: -1 });
PdfDocumentSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model("PdfDocument", PdfDocumentSchema);
