const fs = require("fs");
const path = require("path");

const PdfDocument = require("../models/PdfDocument");
const { checkText, applyCorrections } = require("../utils/grammarChecker");
const { checkTextWithGemini } = require("../utils/geminiChecker");
const { checkTextWithChatGPT } = require("../utils/openaiChecker");
const { checkTextOffline } = require("../utils/offlineSpellChecker");
const { generateCorrectedPdf } = require("../utils/pdfGenerator");
const { extractTextWithPositions, attachBoxesToMistakes } = require("../utils/pdfTextExtractor");
const { detectHallucinations } = require("../utils/hallucinationChecker");
const { detectSensitiveContent } = require("../utils/sensitiveContentChecker");
const { summarizeArticle } = require("../utils/articleSummarizer");
const { UPLOAD_DIR } = require("../middleware/upload");

const ENGINES = {
  languagetool: checkText,
  "ai-gemini": checkTextWithGemini,
  "ai-chatgpt": checkTextWithChatGPT,
  "offline-spellcheck": checkTextOffline,
};

function resolveEngine(requested) {
  return ENGINES[requested] ? requested : "languagetool";
}

/**
 * Runs the full pipeline (extract -> check -> correct -> generate corrected
 * PDF -> save) for one uploaded file, and returns the saved PdfDocument.
 * Used by both the standalone single-file upload endpoint and the
 * multi-file Edition upload endpoint, so there is exactly one place that
 * knows how to process a PDF.
 *
 * `multerFile` is a single entry from req.file / req.files (has .path,
 * .filename, .originalname, .size, .mimetype).
 */
async function processUploadedFile({
  multerFile,
  uploadedBy,
  engine,
  enableHallucinationCheck = false,
  enableSensitiveCheck = false,
  enableSummary = false,
  aiExtrasProvider = "gemini",
}) {
  const resolvedEngine = resolveEngine(engine);
  const relativePath = path.join(process.env.UPLOAD_DIR || "uploads", multerFile.filename);

  // Create the DB record immediately so it shows up even if processing fails
  const doc = await PdfDocument.create({
    uploadedBy,
    originalName: multerFile.originalname,
    storedName: multerFile.filename,
    originalPath: relativePath,
    fileSize: multerFile.size,
    mimeType: multerFile.mimetype,
    status: "processing",
    checkerEngine: resolvedEngine,
    hallucinationCheckRequested: !!enableHallucinationCheck,
    sensitiveCheckRequested: !!enableSensitiveCheck,
    summaryRequested: !!enableSummary,
    aiExtrasProvider:
      enableHallucinationCheck || enableSensitiveCheck || enableSummary ? aiExtrasProvider : "",
  });

  try {
    // 1. Extract text AND per-run bounding boxes from the uploaded PDF
    const fileBuffer = fs.readFileSync(multerFile.path);
    const parsed = await extractTextWithPositions(fileBuffer);
    const extractedText = parsed.fullText;

    // 2. Run spelling/grammar/punctuation check with whichever engine was selected
    const rawMistakes = await ENGINES[resolvedEngine](extractedText);

    // 3. Attach on-page box(es) to each mistake so it can be pinned on the actual PDF
    const mistakes = attachBoxesToMistakes(rawMistakes, parsed.items);

    // 4. Tally mistakes by category for separate counts in the UI
    const counts = mistakes.reduce(
      (acc, m) => {
        const cat = (m.category || "").toUpperCase();
        if (cat === "SPELLING") acc.spelling += 1;
        else if (cat === "GRAMMAR") acc.grammar += 1;
        else if (cat === "PUNCTUATION") acc.punctuation += 1;
        else acc.other += 1;
        return acc;
      },
      { spelling: 0, grammar: 0, punctuation: 0, other: 0 }
    );

    // 5. Build corrected text using top suggestions
    const correctedText = applyCorrections(extractedText, mistakes);

    // 6. Generate a corrected PDF file on disk
    const correctedFileName = `corrected-${multerFile.filename.replace(/\.pdf$/i, "")}.pdf`;
    const correctedAbsolutePath = path.join(UPLOAD_DIR, correctedFileName);
    await generateCorrectedPdf(correctedText, correctedAbsolutePath);
    const correctedRelativePath = path.join(process.env.UPLOAD_DIR || "uploads", correctedFileName);

    // 7. Save everything to MongoDB (this record IS the history entry)
    doc.extractedText = extractedText;
    doc.correctedText = correctedText;
    doc.mistakes = mistakes;
    doc.mistakeCount = mistakes.length;
    doc.spellingCount = counts.spelling;
    doc.grammarCount = counts.grammar;
    doc.punctuationCount = counts.punctuation;
    doc.otherCount = counts.other;
    doc.pageCount = parsed.numPages;
    doc.pages = parsed.pages;
    doc.correctedFileName = correctedFileName;
    doc.correctedPath = correctedRelativePath;
    doc.status = "completed";

    // 8. Optional AI extras — independent of which proofreading engine ran
    // above. Isolated in their own try/catch: if Gemini/ChatGPT is
    // misconfigured, that shouldn't take down the spelling/grammar results
    // the person actually asked for.
    if (enableHallucinationCheck || enableSensitiveCheck || enableSummary) {
      try {
        if (enableHallucinationCheck) {
          const rawFlags = await detectHallucinations(extractedText, aiExtrasProvider);
          doc.hallucinationFlags = attachBoxesToMistakes(rawFlags, parsed.items);
          doc.hallucinationCount = doc.hallucinationFlags.length;
        }
        if (enableSensitiveCheck) {
          const rawFlags = await detectSensitiveContent(extractedText, aiExtrasProvider);
          doc.sensitiveFlags = attachBoxesToMistakes(rawFlags, parsed.items);
          doc.sensitiveFlagCount = doc.sensitiveFlags.length;
        }
        if (enableSummary) {
          const { summary, keyPoints } = await summarizeArticle(extractedText, aiExtrasProvider);
          doc.summary = summary;
          doc.summaryKeyPoints = keyPoints;
        }
      } catch (extrasErr) {
        console.error("[pdfProcessingService] AI extras failed:", extrasErr);
        doc.aiExtrasError = extrasErr.message;
      }
    }

    await doc.save();
  } catch (err) {
    console.error("[pdfProcessingService] processing error:", err);
    doc.status = "failed";
    doc.errorMessage = err.message;
    await doc.save();
  }

  return doc;
}

function canAccessDocument(doc, user) {
  if (user.role === "admin") return true;
  return doc.uploadedBy.toString() === user.id;
}

module.exports = { processUploadedFile, resolveEngine, canAccessDocument, ENGINES };
