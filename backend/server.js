require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const seedAdmin = require("./config/seedAdmin");
const pdfRoutes = require("./routes/pdfRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// --- Middleware ---
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DB + bootstrap ---
connectDB().then(seedAdmin);

console.log(`[Config] LanguageTool: always available (no key needed)`);
console.log(`[Config] Offline Dictionary: always available (no key needed)`);
console.log(`[Config] Gemini (GEMINI_API_KEY): ${process.env.GEMINI_API_KEY ? "detected" : "NOT SET"}`);
console.log(`[Config] ChatGPT (OPENAI_API_KEY): ${process.env.OPENAI_API_KEY ? "detected" : "NOT SET"}`);

// --- Routes ---
app.get("/api/health", (req, res) => res.json({ success: true, message: "API is running" }));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pdf", pdfRoutes);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  if (err.message === "Only PDF files are allowed") {
    return res.status(400).json({ success: false, message: err.message });
  }
  res.status(500).json({ success: false, message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
