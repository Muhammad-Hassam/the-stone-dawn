const User = require("../models/User");
const PdfDocument = require("../models/PdfDocument");

// GET /api/admin/stats
async function getStats(req, res) {
  const [totalUsers, totalDocuments, completedDocs, failedDocs, mistakeAgg, recentDocs] =
    await Promise.all([
      User.countDocuments(),
      PdfDocument.countDocuments(),
      PdfDocument.countDocuments({ status: "completed" }),
      PdfDocument.countDocuments({ status: "failed" }),
      PdfDocument.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$mistakeCount" },
            spelling: { $sum: "$spellingCount" },
            grammar: { $sum: "$grammarCount" },
            punctuation: { $sum: "$punctuationCount" },
          },
        },
      ]),
      PdfDocument.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("uploadedBy", "name email")
        .select("originalName status mistakeCount createdAt uploadedBy"),
    ]);

  const agg = mistakeAgg[0] || {};

  res.json({
    success: true,
    data: {
      totalUsers,
      totalDocuments,
      completedDocs,
      failedDocs,
      totalMistakesCaught: agg.total || 0,
      totalSpelling: agg.spelling || 0,
      totalGrammar: agg.grammar || 0,
      totalPunctuation: agg.punctuation || 0,
      recentDocs,
    },
  });
}

module.exports = { getStats };
