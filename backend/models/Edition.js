const mongoose = require("mongoose");

const EditionFileSchema = new mongoose.Schema(
  {
    pdfDocument: { type: mongoose.Schema.Types.ObjectId, ref: "PdfDocument", required: true },
    pageNumber: { type: Number, required: true },
  },
  { _id: false }
);

const EditionSchema = new mongoose.Schema(
  {
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    section: { type: String, default: "General" }, // a label for the report only — doesn't change the checks
    checkerEngine: {
      type: String,
      enum: ["languagetool", "ai-gemini", "ai-chatgpt", "offline-spellcheck"],
      default: "languagetool",
    },

    // Stored now so the setting isn't lost, but the actual verify-against-
    // search-results pipeline isn't implemented yet — see README.
    liveFactCheck: { type: Boolean, default: false },

    files: { type: [EditionFileSchema], default: [] },

    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },

    // Aggregated across all files, filled in once every file has finished
    pageCount: { type: Number, default: 0 },
    mistakeCount: { type: Number, default: 0 },
    spellingCount: { type: Number, default: 0 },
    grammarCount: { type: Number, default: 0 },
    punctuationCount: { type: Number, default: 0 },
    otherCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

EditionSchema.index({ createdAt: -1 });
EditionSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model("Edition", EditionSchema);
