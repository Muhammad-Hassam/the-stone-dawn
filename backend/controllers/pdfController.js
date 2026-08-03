const fs = require("fs");
const path = require("path");

const PdfDocument = require("../models/PdfDocument");
const { processUploadedFile, canAccessDocument } = require("../services/pdfProcessingService");

// POST /api/pdf/upload — single standalone file (still supported for direct/simple use)
async function uploadPdf(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No PDF file uploaded" });
  }

  const doc = await processUploadedFile({
    multerFile: req.file,
    uploadedBy: req.user.id,
    engine: req.body.engine,
    enableHallucinationCheck: req.body.enableHallucinationCheck === "true",
    enableSensitiveCheck: req.body.enableSensitiveCheck === "true",
    enableSummary: req.body.enableSummary === "true",
    aiExtrasProvider: req.body.aiExtrasProvider === "chatgpt" ? "chatgpt" : "gemini",
  });

  if (doc.status === "failed") {
    return res.status(500).json({
      success: false,
      message: "File uploaded but processing failed",
      data: doc,
    });
  }

  return res.status(201).json({ success: true, data: doc });
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

// GET /api/pdf/:id
async function getById(req, res) {
  const doc = await PdfDocument.findById(req.params.id).populate("uploadedBy", "name email");
  if (!doc) {
    return res.status(404).json({ success: false, message: "Document not found" });
  }
  if (!canAccessDocument(doc, req.user)) {
    return res.status(403).json({ success: false, message: "You don't have access to this document" });
  }
  res.json({ success: true, data: doc });
}

// GET /api/pdf/:id/view/original — inline bytes for the in-browser PDF viewer (not a forced download)
async function viewOriginal(req, res) {
  const doc = await PdfDocument.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Document not found" });
  if (!canAccessDocument(doc, req.user)) {
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
  if (!canAccessDocument(doc, req.user)) {
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
  if (!canAccessDocument(doc, req.user)) {
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
  if (!canAccessDocument(doc, req.user)) {
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
