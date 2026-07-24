/**
 * Extracts text from a PDF the same way pdf-parse would, but also records
 * the bounding box of every text run so a character offset (like the ones
 * LanguageTool returns) can be mapped back to a position on the actual
 * rendered page.
 *
 * Boxes are stored in "scale 1" viewport space (top-left origin, y grows
 * downward — normal screen/canvas coordinate convention). Viewport
 * coordinates scale linearly with the render scale, so the frontend only
 * has to multiply by whatever scale it's rendering the page at — no pdf.js
 * math needed on that side beyond rendering the page itself.
 */
async function extractTextWithPositions(buffer) {
  // pdf.js ships as ESM; dynamic import works fine from this CommonJS file.
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  let fullText = "";
  const items = []; // { page, offsetStart, offsetEnd, box: [left, top, right, bottom] }
  const pages = []; // { pageNumber, width, height } at scale 1

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    pages.push({ pageNumber: pageNum, width: viewport.width, height: viewport.height });

    const content = await page.getTextContent();

    for (const item of content.items) {
      if (typeof item.str !== "string") continue;

      const offsetStart = fullText.length;
      fullText += item.str;
      const offsetEnd = fullText.length;

      if (item.str.trim().length > 0) {
        const [x0, y0] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
        const [x1, y1] = viewport.convertToViewportPoint(
          item.transform[4] + item.width,
          item.transform[5] + item.height
        );

        items.push({
          page: pageNum,
          text: item.str,
          offsetStart,
          offsetEnd,
          box: [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)],
        });
      }

      fullText += item.hasEOL ? "\n" : " ";
    }

    fullText += "\n\n"; // page break
  }

  return { fullText, items, pages, numPages: doc.numPages };
}

/**
 * Given mistakes (with .offset/.length from the grammar checker) and the
 * positional `items` from extractTextWithPositions, attaches the on-page
 * box(es) each mistake overlaps so the frontend can draw a highlight/pin.
 */
function attachBoxesToMistakes(mistakes, items) {
  return mistakes.map((m) => {
    const mistakeStart = m.offset;
    const mistakeEnd = m.offset + m.length;

    const boxes = items
      .filter((it) => it.offsetStart < mistakeEnd && it.offsetEnd > mistakeStart)
      .map((it) => {
        const itemLen = it.offsetEnd - it.offsetStart;
        const [left, top, right, bottom] = it.box;

        // If the mistake covers the whole run, use its box as-is. If it only
        // covers part of a multi-word run (e.g. one word inside a headline
        // stored as a single text item), estimate a tighter sub-box using
        // the character position ratio within the run — not pixel-perfect
        // (glyph widths vary), but far closer than highlighting the entire run.
        if (itemLen <= 0 || (it.offsetStart <= mistakeStart && it.offsetEnd >= mistakeEnd && itemLen === m.length)) {
          return { page: it.page, box: [left, top, right, bottom] };
        }

        const relStart = Math.max(0, mistakeStart - it.offsetStart);
        const relEnd = Math.min(itemLen, mistakeEnd - it.offsetStart);
        const ratioStart = relStart / itemLen;
        const ratioEnd = relEnd / itemLen;
        const width = right - left;

        return {
          page: it.page,
          box: [left + ratioStart * width, top, left + ratioEnd * width, bottom],
        };
      });

    return { ...m, boxes };
  });
}

module.exports = { extractTextWithPositions, attachBoxesToMistakes };
