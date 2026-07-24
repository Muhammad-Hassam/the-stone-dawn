const User = require("../models/User");

async function seedAdmin() {
  const adminExists = await User.findOne({ role: "admin" });
  if (adminExists) return;

  const name = process.env.ADMIN_NAME || "Admin";
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  const passwordHash = await User.hashPassword(password);
  await User.create({ name, email, passwordHash, role: "admin" });

  console.log(`[Seed] First admin created → ${email} (change this password after first login)`);
}

module.exports = seedAdmin;
