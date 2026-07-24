const express = require("express");
const router = express.Router();

const { upload } = require("../middleware/upload");
const { protect } = require("../middleware/auth");
const {
  uploadPdf,
  getHistory,
  getById,
  viewOriginal,
  downloadOriginal,
  downloadCorrected,
  deleteDocument,
} = require("../controllers/pdfController");

// Wrap async handlers so errors go to Express error middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(protect); // every route below requires a valid logged-in user

router.post("/upload", upload.single("pdf"), asyncHandler(uploadPdf));
router.get("/history", asyncHandler(getHistory));
router.get("/:id", asyncHandler(getById));
router.get("/:id/view/original", asyncHandler(viewOriginal));
router.get("/:id/download/original", asyncHandler(downloadOriginal));
router.get("/:id/download/corrected", asyncHandler(downloadCorrected));
router.delete("/:id", asyncHandler(deleteDocument));

module.exports = router;
