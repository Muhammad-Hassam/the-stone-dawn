import { useEffect, useRef, useState } from "react";

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

/**
 * Renders page 1 of a local File (not yet uploaded anywhere) onto a small
 * canvas, entirely client-side. Used on the "confirm the pages" step so
 * people can see what they're numbering before anything touches the server.
 */
export default function PdfThumbnail({ file, width = 220 }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const [pdfjsLib, arrayBuffer] = await Promise.all([loadPdfjs(), file.arrayBuffer()]);
        const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        if (cancelled) return;

        const page = await doc.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = width / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not render preview");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, width]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-paper border border-rule rounded-sm text-muted font-ui text-[11px] p-4 text-center"
        style={{ width, height: width * 1.3 }}
      >
        Couldn't preview this file
      </div>
    );
  }

  return (
    <div className="relative" style={{ width }}>
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-paper border border-rule rounded-sm text-muted font-ui text-[11px]"
          style={{ width, height: width * 1.3 }}
        >
          Rendering…
        </div>
      )}
      <canvas ref={canvasRef} className="block border border-rule rounded-sm w-full" />
    </div>
  );
}
