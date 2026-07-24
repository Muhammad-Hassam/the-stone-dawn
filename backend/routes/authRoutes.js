const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../middleware/auth");
const {
  login,
  me,
  createUser,
  listUsers,
  updateUser,
  deleteUser,
} = require("../controllers/authController");

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post("/login", asyncHandler(login));
router.get("/me", protect, asyncHandler(me));

// Admin-only staff management
router.get("/users", protect, adminOnly, asyncHandler(listUsers));
router.post("/users", protect, adminOnly, asyncHandler(createUser));
router.patch("/users/:id", protect, adminOnly, asyncHandler(updateUser));
router.delete("/users/:id", protect, adminOnly, asyncHandler(deleteUser));

module.exports = router;
