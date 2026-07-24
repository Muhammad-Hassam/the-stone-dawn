const fs = require("fs");
const path = require("path");

const PdfDocument = require("../models/PdfDocument");
const { checkText, applyCorrections } = require("../utils/grammarChecker");
const { generateCorrectedPdf } = require("../utils/pdfGenerator");
const { extractTextWithPositions, attachBoxesToMistakes } = require("../utils/pdfTextExtractor");
const { UPLOAD_DIR } = require("../middleware/upload");

// POST /api/pdf/upload
async function uploadPdf(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No PDF file uploaded" });
  }

  const absolutePath = req.file.path;
  const relativePath = path.join(process.env.UPLOAD_DIR || "uploads", req.file.filename);

  // Create the DB record immediately so it shows in history even if processing fails
  const doc = await PdfDocument.create({
    uploadedBy: req.user.id,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    originalPath: relativePath, // <-- path saved in DB, as requested
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    status: "processing",
  });

  try {
    // 1. Extract text AND per-run bounding boxes from the uploaded PDF
    const fileBuffer = fs.readFileSync(absolutePath);
    const parsed = await extractTextWithPositions(fileBuffer);
    const extractedText = parsed.fullText;

    // 2. Run spelling/grammar check
    const rawMistakes = await checkText(extractedText);

    // 3. Attach on-page box(es) to each mistake so it can be pinned on the actual PDF
    const mistakes = attachBoxesToMistakes(rawMistakes, parsed.items);

    // 4. Build corrected text using top suggestions
    const correctedText = applyCorrections(extractedText, mistakes);

    // 5. Generate a corrected PDF file on disk
    const correctedFileName = `corrected-${req.file.filename.replace(/\.pdf$/i, "")}.pdf`;
    const correctedAbsolutePath = path.join(UPLOAD_DIR, correctedFileName);
    await generateCorrectedPdf(correctedText, correctedAbsolutePath);
    const correctedRelativePath = path.join(process.env.UPLOAD_DIR || "uploads", correctedFileName);

    // 6. Save everything to MongoDB (this record IS the history entry)
    doc.extractedText = extractedText;
    doc.correctedText = correctedText;
    doc.mistakes = mistakes;
    doc.mistakeCount = mistakes.length;
    doc.pageCount = parsed.numPages;
    doc.pages = parsed.pages;
    doc.correctedFileName = correctedFileName;
    doc.correctedPath = correctedRelativePath;
    doc.status = "completed";
    await doc.save();

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("[uploadPdf] processing error:", err);
    doc.status = "failed";
    doc.errorMessage = err.message;
    await doc.save();
    return res.status(500).json({
      success: false,
      message: "File uploaded but processing failed",
      data: doc,
    });
  }
}

// GET /api/pdf/history?page=1&limit=10&search=&userId=
// Regular users only ever see their own uploads.
// Admins see everyone's uploads, and can filter by a specific userId.
async function getHistory(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";

  const query = {};
  if (search) query.originalName = { $regex: search, $options: "i" };

  if (req.user.role === "admin") {
    if (req.query.userId) query.uploadedBy = req.query.userId;
  } else {
    query.uploadedBy = req.user.id;
  }

  let dbQuery = PdfDocument.find(query)
    .select("-extractedText -correctedText -mistakes") // keep list light
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  if (req.user.role === "admin") {
    dbQuery = dbQuery.populate("uploadedBy", "name email");
  }

  const [items, total] = await Promise.all([dbQuery, PdfDocument.countDocuments(query)]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

function canAccess(doc, user) {
  if (user.role === "admin") return true;
  return doc.uploadedBy.toString() === user.id;
}

// GET /api/pdf/:id
async function getById(req, res) {
  const doc = await PdfDocument.findById(req.params.id).populate("uploadedBy", "name email");
  if (!doc) {
    return res.status(404).json({ success: false, message: "Document not found" });
  }
  if (!canAccess(doc, req.user)) {
    return res.status(403).json({ success: false, message: "You don't have access to this document" });
  }
  res.json({ success: true, data: doc });
}

// GET /api/pdf/:id/view/original — inline bytes for the in-browser PDF viewer (not a forced download)
async function viewOriginal(req, res) {
  const doc = await PdfDocument.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
  if (!canAccess(doc, req.user)) {
    return res.status(403).json({ success: false, message: "You don't have access to this document" });
  }

  const fullPath = path.join(__dirname, "..", doc.originalPath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ success: false, message: "File missing on server" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline");
  fs.createReadStream(fullPath).pipe(res);
}

// GET /api/pdf/:id/download/original
async function downloadOriginal(req, res) {
  const doc = await PdfDocument.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
  if (!canAccess(doc, req.user)) {
    return res.status(403).json({ success: false, message: "You don't have access to this document" });
  }

  const fullPath = path.join(__dirname, "..", doc.originalPath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ success: false, message: "File missing on server" });
  }
  res.download(fullPath, doc.originalName);
}

// GET /api/pdf/:id/download/corrected
async function downloadCorrected(req, res) {
  const doc = await PdfDocument.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
  if (!canAccess(doc, req.user)) {
    return res.status(403).json({ success: false, message: "You don't have access to this document" });
  }
  if (!doc.correctedPath) {
    return res.status(400).json({ success: false, message: "Corrected file not available" });
  }

  const fullPath = path.join(__dirname, "..", doc.correctedPath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ success: false, message: "File missing on server" });
  }
  res.download(fullPath, `corrected-${doc.originalName}`);
}

// DELETE /api/pdf/:id
async function deleteDocument(req, res) {
  const doc = await PdfDocument.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
  if (!canAccess(doc, req.user)) {
    return res.status(403).json({ success: false, message: "You don't have access to this document" });
  }

  const originalFull = path.join(__dirname, "..", doc.originalPath);
  const correctedFull = doc.correctedPath ? path.join(__dirname, "..", doc.correctedPath) : null;

  [originalFull, correctedFull].forEach((p) => {
    if (p && fs.existsSync(p)) fs.unlinkSync(p);
  });

  await doc.deleteOne();
  res.json({ success: true, message: "Document deleted" });
}

module.exports = {
  uploadPdf,
  getHistory,
  getById,
  viewOriginal,
  downloadOriginal,
  downloadCorrected,
  deleteDocument,
};
