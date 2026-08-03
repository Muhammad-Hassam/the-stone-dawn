const express = require("express");
const router = express.Router();

const { upload } = require("../middleware/upload");
const { protect } = require("../middleware/auth");
const {
  uploadEdition,
  getEditionHistory,
  getEditionById,
  updatePageNumbers,
  deleteEdition,
} = require("../controllers/editionController");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(protect);

router.post("/upload", upload.array("pdfs", 60), asyncHandler(uploadEdition));
router.get("/history", asyncHandler(getEditionHistory));
router.get("/:id", asyncHandler(getEditionById));
router.patch("/:id/pages", asyncHandler(updatePageNumbers));
router.delete("/:id", asyncHandler(deleteEdition));

module.exports = router;
