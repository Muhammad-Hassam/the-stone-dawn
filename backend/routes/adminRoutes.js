const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../middleware/auth");
const { getStats } = require("../controllers/adminController");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get("/stats", protect, adminOnly, asyncHandler(getStats));

module.exports = router;
