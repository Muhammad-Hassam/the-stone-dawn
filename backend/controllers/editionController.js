const fs = require("fs");
const path = require("path");

const Edition = require("../models/Edition");
const PdfDocument = require("../models/PdfDocument");
const { processUploadedFile } = require("../services/pdfProcessingService");

function canAccessEdition(edition, user) {
  if (user.role === "admin") return true;
  return edition.uploadedBy.toString() === user.id;
}

// Fields safe to expose in the file list without pulling the heavy stuff
// (extractedText, correctedText, mistakes with boxes) into every response.
const FILE_SUMMARY_FIELDS =
  "originalName mistakeCount spellingCount grammarCount punctuationCount pageCount status errorMessage checkerEngine hallucinationCount summaryRequested hallucinationCheckRequested sensitiveFlagCount sensitiveCheckRequested";

// POST /api/editions/upload
// multipart form fields: pdfs (multiple files), pageNumbers (JSON array of
// numbers, same order as the files), section, liveFactCheck, engine
async function uploadEdition(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: "No PDF files uploaded" });
  }

  let pageNumbers = [];
  try {
    pageNumbers = JSON.parse(req.body.pageNumbers || "[]");
  } catch {
    pageNumbers = [];
  }
  if (!Array.isArray(pageNumbers) || pageNumbers.length !== req.files.length) {
    // fall back to sequential numbering rather than rejecting the upload
    pageNumbers = req.files.map((_, i) => i + 1);
  }

  const liveFactCheck = req.body.liveFactCheck === "true" || req.body.liveFactCheck === true;

  const edition = await Edition.create({
    uploadedBy: req.user.id,
    section: req.body.section || "General",
    checkerEngine: req.body.engine,
    liveFactCheck,
    status: "processing",
  });

  // Process every page sequentially — same reasoning as the frontend queue:
  // keeps ordering predictable and doesn't burst-hammer whichever checking
  // API is selected.
  const fileEntries = [];
  for (let i = 0; i < req.files.length; i++) {
    const doc = await processUploadedFile({
      multerFile: req.files[i],
      uploadedBy: req.user.id,
      engine: req.body.engine,
      enableHallucinationCheck: req.body.enableHallucinationCheck === "true",
      enableSensitiveCheck: req.body.enableSensitiveCheck === "true",
      enableSummary: req.body.enableSummary === "true",
      aiExtrasProvider: req.body.aiExtrasProvider === "chatgpt" ? "chatgpt" : "gemini",
    });
    fileEntries.push({ pdfDocument: doc._id, pageNumber: pageNumbers[i] ?? i + 1 });
  }

  fileEntries.sort((a, b) => a.pageNumber - b.pageNumber);
  edition.files = fileEntries;

  // Aggregate counts + overall status across every page
  const docs = await PdfDocument.find({ _id: { $in: fileEntries.map((f) => f.pdfDocument) } });
  const anyFailed = docs.some((d) => d.status === "failed");

  edition.pageCount = docs.length;
  edition.mistakeCount = docs.reduce((sum, d) => sum + (d.mistakeCount || 0), 0);
  edition.spellingCount = docs.reduce((sum, d) => sum + (d.spellingCount || 0), 0);
  edition.grammarCount = docs.reduce((sum, d) => sum + (d.grammarCount || 0), 0);
  edition.punctuationCount = docs.reduce((sum, d) => sum + (d.punctuationCount || 0), 0);
  edition.otherCount = docs.reduce((sum, d) => sum + (d.otherCount || 0), 0);
  edition.status = anyFailed ? "failed" : "completed";

  await edition.save();

  const populated = await Edition.findById(edition._id)
    .populate("files.pdfDocument", FILE_SUMMARY_FIELDS)
    .populate("uploadedBy", "name email");

  const statusCode = anyFailed ? 207 : 201; // 207: some pages succeeded, some didn't
  res.status(statusCode).json({ success: true, data: populated });
}

// GET /api/editions/history?page=1&limit=10&search=&userId=
async function getEditionHistory(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";

  const query = {};
  if (search) query.section = { $regex: search, $options: "i" };

  if (req.user.role === "admin") {
    if (req.query.userId) query.uploadedBy = req.query.userId;
  } else {
    query.uploadedBy = req.user.id;
  }

  let dbQuery = Edition.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);

  if (req.user.role === "admin") {
    dbQuery = dbQuery.populate("uploadedBy", "name email");
  }

  const [items, total] = await Promise.all([dbQuery, Edition.countDocuments(query)]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// GET /api/editions/:id
async function getEditionById(req, res) {
  const edition = await Edition.findById(req.params.id)
    .populate("files.pdfDocument", FILE_SUMMARY_FIELDS)
    .populate("uploadedBy", "name email");

  if (!edition) return res.status(404).json({ success: false, message: "Edition not found" });
  if (!canAccessEdition(edition, req.user)) {
    return res.status(403).json({ success: false, message: "You don't have access to this edition" });
  }

  res.json({ success: true, data: edition });
}

// PATCH /api/editions/:id/pages — edit page-number assignment after the fact
// body: { files: [{ pdfDocumentId, pageNumber }] }
async function updatePageNumbers(req, res) {
  const edition = await Edition.findById(req.params.id);
  if (!edition) return res.status(404).json({ success: false, message: "Edition not found" });
  if (!canAccessEdition(edition, req.user)) {
    return res.status(403).json({ success: false, message: "You don't have access to this edition" });
  }

  const updates = Array.isArray(req.body.files) ? req.body.files : [];
  const pageNumberById = new Map(updates.map((f) => [String(f.pdfDocumentId), f.pageNumber]));

  edition.files = edition.files.map((f) => ({
    pdfDocument: f.pdfDocument,
    pageNumber: pageNumberById.get(String(f.pdfDocument)) ?? f.pageNumber,
  }));
  edition.files.sort((a, b) => a.pageNumber - b.pageNumber);

  await edition.save();

  const populated = await Edition.findById(edition._id).populate(
    "files.pdfDocument",
    FILE_SUMMARY_FIELDS
  );
  res.json({ success: true, data: populated });
}

// DELETE /api/editions/:id — cascades to every page's PdfDocument + files on disk
async function deleteEdition(req, res) {
  const edition = await Edition.findById(req.params.id);
  if (!edition) return res.status(404).json({ success: false, message: "Edition not found" });
  if (!canAccessEdition(edition, req.user)) {
    return res.status(403).json({ success: false, message: "You don't have access to this edition" });
  }

  const docs = await PdfDocument.find({ _id: { $in: edition.files.map((f) => f.pdfDocument) } });

  for (const doc of docs) {
    const originalFull = path.join(__dirname, "..", doc.originalPath);
    const correctedFull = doc.correctedPath ? path.join(__dirname, "..", doc.correctedPath) : null;
    [originalFull, correctedFull].forEach((p) => {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    });
    await doc.deleteOne();
  }

  await edition.deleteOne();
  res.json({ success: true, message: "Edition deleted" });
}

module.exports = {
  uploadEdition,
  getEditionHistory,
  getEditionById,
  updatePageNumbers,
  deleteEdition,
};
