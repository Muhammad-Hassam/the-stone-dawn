const fs = require("fs");
const PDFDocument = require("pdfkit");

/**
 * Generates a simple, readable PDF from corrected text.
 * (Rebuilding the exact original layout is out of scope; this produces
 * a clean corrected document. Original PDF is always kept for reference.)
 */
function generateCorrectedPdf(text, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      doc
        .fontSize(16)
        .text("Corrected Document", { align: "center" })
        .moveDown(1);

      doc.fontSize(11).font("Helvetica");

      const paragraphs = (text || "").split(/\n{2,}/);
      paragraphs.forEach((para, idx) => {
        doc.text(para.trim(), { align: "left", lineGap: 4 });
        if (idx < paragraphs.length - 1) doc.moveDown(0.8);
      });

      doc.end();

      stream.on("finish", () => resolve(outputPath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateCorrectedPdf };
