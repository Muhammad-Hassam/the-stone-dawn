const jwt = require("jsonwebtoken");
const User = require("../models/User");

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const match = await user.comparePassword(password);
  if (!match) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const token = signToken(user);
  res.json({ success: true, data: { token, user: user.toSafeObject() } });
}

// GET /api/auth/me
async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, data: user.toSafeObject() });
}

// POST /api/auth/users  (admin only) — create a new staff/user account
async function createUser(req, res) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Name, email, and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }
  if (role && !["admin", "user"].includes(role)) {
    return res.status(400).json({ success: false, message: "Role must be 'admin' or 'user'" });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ success: false, message: "A user with this email already exists" });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role: role || "user",
  });

  res.status(201).json({ success: true, data: user.toSafeObject() });
}

// GET /api/auth/users  (admin only)
async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, data: users.map((u) => u.toSafeObject()) });
}

// PATCH /api/auth/users/:id  (admin only) — toggle active state or change role
async function updateUser(req, res) {
  const { role, isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  if (role && ["admin", "user"].includes(role)) user.role = role;
  if (typeof isActive === "boolean") user.isActive = isActive;

  await user.save();
  res.json({ success: true, data: user.toSafeObject() });
}

// DELETE /api/auth/users/:id  (admin only)
async function deleteUser(req, res) {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ success: false, message: "You can't delete your own account" });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  if (user.role === "admin") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      return res.status(400).json({ success: false, message: "Can't delete the last remaining admin" });
    }
  }

  await user.deleteOne();
  res.json({ success: true, message: "User deleted" });
}

module.exports = { login, me, createUser, listUsers, updateUser, deleteUser };
