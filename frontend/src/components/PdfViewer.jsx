import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import axiosClient from "../api/axiosClient";

let pdfjsLibPromise = null;
function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).href;
      return pdfjsLib;
    });
  }
  return pdfjsLibPromise;
}

function categoryColor(category) {
  const c = (category || "").toUpperCase();
  if (c.includes("SPELL") || c.includes("TYPO")) return "var(--color-redpen)";
  if (c.includes("GRAMMAR")) return "var(--color-brass)";
  if (c.includes("PUNCT")) return "var(--color-punct)";
  return "var(--color-muted)";
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

/**
 * Renders the actual uploaded PDF page-by-page on a canvas and overlays a
 * highlight + numbered pin at each mistake's real position on the page,
 * using the box coordinates the backend computed via pdf.js text-position
 * extraction (stored in scale-1 viewport space — we multiply by our current
 * fit-to-width scale AND the user's zoom level to land in canvas pixels).
 */
const PdfViewer = forwardRef(function PdfViewer({ documentId, mistakes, pages, visible = true }, ref) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(pages?.length || 1);
  const [zoom, setZoom] = useState(1); // 1 = fit-to-width
  const [renderScale, setRenderScale] = useState(1);
  const [pageCssSize, setPageCssSize] = useState({ width: 0, height: 0 });
  const [openMistakeIdx, setOpenMistakeIdx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---- load the PDF bytes (auth'd fetch) and hand them to pdf.js ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [pdfjsLib, res] = await Promise.all([
          loadPdfjs(),
          axiosClient.get(`/pdf/${documentId}/view/original`, { responseType: "arraybuffer" }),
        ]);
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(res.data) }).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load the PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  // ---- render the current page onto the canvas ----
  useEffect(() => {
    if (!pdfDoc || !visible) return;
    let cancelled = false;

    (async () => {
      const page = await pdfDoc.getPage(currentPage);
      if (cancelled) return;

      const containerWidth = wrapperRef.current?.clientWidth || 700;
      const baseViewport = page.getViewport({ scale: 1 });
      const fitScale = containerWidth / baseViewport.width;
      const scale = Math.min(fitScale * zoom, 4.5);
      const viewport = page.getViewport({ scale });

      const outputScale = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      await page.render({
        canvasContext: ctx,
        viewport,
        transform,
      }).promise;

      if (cancelled) return;
      setRenderScale(scale);
      setPageCssSize({ width: viewport.width, height: viewport.height });
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, visible, zoom]);

  const mistakesOnPage = (mistakes || [])
    .map((m, idx) => ({ ...m, idx }))
    .filter((m) => m.boxes?.some((b) => b.page === currentPage));

  const totalMistakes = mistakes?.length || 0;
  const pinnedMistakes = (mistakes || []).filter((m) => m.boxes?.length > 0).length;
  const unpinnedCount = totalMistakes - pinnedMistakes;

  const goToMistake = (idx) => {
    const m = mistakes?.[idx];
    if (!m || !m.boxes?.length) return;
    const page = m.boxes[0].page;
    setOpenMistakeIdx(idx);
    if (page !== currentPage) {
      setCurrentPage(page);
    }
    // scroll the viewer into view
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useImperativeHandle(ref, () => ({ goToMistake }));

  return (
    <div ref={containerRef} className="bg-card border border-rule rounded-md p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="font-ui text-[12px] text-muted">
          {mistakesOnPage.length} slip{mistakesOnPage.length === 1 ? "" : "s"} on this page
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* zoom controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
              disabled={zoom <= ZOOM_MIN}
              className="font-ui text-sm font-medium w-7 h-7 flex items-center justify-center border border-rule rounded-sm text-ink disabled:opacity-30 hover:border-ink"
              title="Zoom out"
            >
              −
            </button>
            <button
              onClick={() => setZoom(1)}
              className="font-mono text-xs text-muted w-12 text-center hover:text-ink"
              title="Reset to fit width"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
              disabled={zoom >= ZOOM_MAX}
              className="font-ui text-sm font-medium w-7 h-7 flex items-center justify-center border border-rule rounded-sm text-ink disabled:opacity-30 hover:border-ink"
              title="Zoom in"
            >
              +
            </button>
          </div>

          {/* page nav */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setOpenMistakeIdx(null);
                setCurrentPage((p) => Math.max(1, p - 1));
              }}
              disabled={currentPage <= 1}
              className="font-ui text-[12px] font-medium px-3 py-1.5 border border-rule rounded-sm text-ink disabled:opacity-30 hover:border-ink"
            >
              ‹ Prev
            </button>
            <span className="font-mono text-xs text-muted">
              Page {currentPage} / {numPages}
            </span>
            <button
              onClick={() => {
                setOpenMistakeIdx(null);
                setCurrentPage((p) => Math.min(numPages, p + 1));
              }}
              disabled={currentPage >= numPages}
              className="font-ui text-[12px] font-medium px-3 py-1.5 border border-rule rounded-sm text-ink disabled:opacity-30 hover:border-ink"
            >
              Next ›
            </button>
          </div>
        </div>
      </div>

      {error && <p className="font-serif text-redpen">{error}</p>}
      {loading && !error && (
        <p className="font-serif text-muted py-10 text-center">Opening the original file…</p>
      )}

      <div
        ref={wrapperRef}
        className="relative mx-auto overflow-auto border border-rule"
        style={{ maxWidth: "100%", maxHeight: "75vh" }}
      >
        <div
          className="relative"
          style={{ width: pageCssSize.width || undefined, height: pageCssSize.height || undefined }}
        >
          <canvas ref={canvasRef} className="block" />

          {/* highlight rectangles + pins */}
          {mistakesOnPage.map((m) => {
            const color = categoryColor(m.category);
            const boxesOnThisPage = m.boxes.filter((b) => b.page === currentPage);
            const firstBox = boxesOnThisPage[0].box;
            const pinLeft = firstBox[0] * renderScale;
            const pinTop = firstBox[1] * renderScale;

            return (
              <div key={m.idx}>
                {boxesOnThisPage.map((b, bi) => {
                  const [l, t, r, btm] = b.box;
                  return (
                    <div
                      key={bi}
                      onClick={() => setOpenMistakeIdx(m.idx === openMistakeIdx ? null : m.idx)}
                      className="absolute cursor-pointer rounded-[2px]"
                      style={{
                        left: l * renderScale,
                        top: t * renderScale,
                        width: (r - l) * renderScale,
                        height: (btm - t) * renderScale,
                        backgroundColor: color,
                        opacity: openMistakeIdx === m.idx ? 0.35 : 0.22,
                        borderBottom: `2px solid ${color}`,
                      }}
                      title={m.message}
                    />
                  );
                })}

                {/* numbered pin */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMistakeIdx(m.idx === openMistakeIdx ? null : m.idx);
                  }}
                  className="absolute flex items-center justify-center rounded-full font-mono font-bold text-white shadow-sm"
                  style={{
                    left: Math.max(0, pinLeft - 9),
                    top: Math.max(0, pinTop - 20),
                    width: 18,
                    height: 18,
                    fontSize: 10,
                    backgroundColor: color,
                    border: "1.5px solid var(--color-card)",
                    zIndex: 5,
                  }}
                >
                  {m.idx + 1}
                </button>

                {/* popover */}
                {openMistakeIdx === m.idx && (
                  <div
                    className="absolute z-20 bg-card border-2 rounded-sm shadow-lg p-3 text-sm"
                    style={{
                      left: Math.min(Math.max(0, pinLeft - 10), Math.max(0, pageCssSize.width - 260)),
                      top: pinTop + 12,
                      width: 250,
                      borderColor: color,
                    }}
                  >
                    <span
                      className="font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm"
                      style={{ color, borderColor: color }}
                    >
                      {m.category || "OTHER"}
                    </span>
                    <p className="font-mono text-xs mt-2">
                      <span className="line-through text-redpen">{m.originalText}</span>
                      {m.appliedSuggestion && (
                        <span className="text-greenpen font-semibold ml-2">
                          → {m.appliedSuggestion}
                        </span>
                      )}
                    </p>
                    <p className="font-serif text-[12px] text-ink/70 mt-1.5">{m.message}</p>
                    <button
                      onClick={() => setOpenMistakeIdx(null)}
                      className="font-ui text-[10px] tracking-wide uppercase text-ink/40 hover:text-redpen mt-2"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {unpinnedCount > 0 && (
        <p className="font-ui text-[12px] text-muted mt-3">
          {pinnedMistakes} of {totalMistakes} slips are pinned on the page. {unpinnedCount} couldn't
          be matched to an exact spot on the PDF (usually text spanning an unusual layout run) —
          they're still listed with full detail in the Proof Sheet tab.
        </p>
      )}
    </div>
  );
});

export default PdfViewer;
