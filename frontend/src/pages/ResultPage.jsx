import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import PdfViewer from "../components/PdfViewer";

const TABS = [
  { key: "marked", label: "Marked PDF" },
  { key: "clean", label: "Clean Copy" },
  { key: "proof", label: "Proof Sheet" },
];

function categoryTagClass(category) {
  const c = (category || "").toUpperCase();
  if (c.includes("SPELL") || c.includes("TYPO")) return "text-redpen border-redpen";
  if (c.includes("GRAMMAR")) return "text-brass border-brass";
  return "text-[#4B5A66] border-[#4B5A66]";
}

export default function ResultPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("marked");
  const pdfViewerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axiosClient.get(`/pdf/${id}`);
        if (!cancelled) setDoc(data.data);
      } catch (err) {
        toast.error(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-paper paper-texture">
        <p className="font-ui text-sm tracking-widest uppercase text-ink/40">
          Fetching from the archive…
        </p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-paper paper-texture">
        <p className="font-serif text-ink/60">This edition could not be found.</p>
      </div>
    );
  }

  const apiBase = axiosClient.defaults.baseURL;
  const statusColor =
    doc.status === "completed"
      ? "text-greenpen"
      : doc.status === "failed"
      ? "text-redpen"
      : "text-brass";

  const showOnPdf = (idx) => {
    setTab("marked");
    // wait a tick so the tab is visible before we ask the viewer to jump
    setTimeout(() => pdfViewerRef.current?.goToMistake(idx), 50);
  };

  return (
    <div className="min-h-screen bg-paper paper-texture">
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-24">
        <Link
          to="/history"
          className="font-ui text-[11px] tracking-[0.15em] uppercase text-ink/50 hover:text-redpen"
        >
          &larr; Back Issues
        </Link>

        {/* Byline block */}
        <div className="flex items-start justify-between gap-6 mt-4 mb-6 border-b border-rule pb-6">
          <div>
            <div className="font-ui text-[11px] tracking-[0.2em] uppercase text-ink/40 mb-2">
              Filed Copy
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-ink leading-tight mb-3">
              {doc.originalName}
            </h1>
            <p className="font-ui text-[12px] tracking-wide text-ink/60">
              <span className={`font-semibold uppercase ${statusColor}`}>{doc.status}</span>
              {"  ·  "}
              {doc.mistakeCount} slip{doc.mistakeCount === 1 ? "" : "s"} caught
              {doc.pageCount ? `  ·  ${doc.pageCount} page(s)` : ""}
              {"  ·  "}
              {new Date(doc.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {doc.uploadedBy?.name && (
                <>
                  {"  ·  filed by "}
                  {doc.uploadedBy.name}
                </>
              )}
            </p>
          </div>

          {doc.status === "completed" && (
            <div
              className="ink-stamp text-redpen shrink-0 hidden sm:flex"
              style={{ width: 92, height: 92 }}
            >
              <span className="font-mono font-bold text-2xl leading-none">
                {doc.mistakeCount}
              </span>
              <span className="font-ui text-[8px] tracking-[0.15em] uppercase mt-1">
                Marks
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <a
            href={`${apiBase}/pdf/${doc._id}/download/original`}
            className="font-ui text-[12px] tracking-[0.1em] uppercase font-semibold px-5 py-2.5 rounded-sm border-2 border-ink/70 text-ink hover:bg-ink hover:text-card transition-colors"
          >
            Original Scan
          </a>
          {doc.correctedPath && (
            <a
              href={`${apiBase}/pdf/${doc._id}/download/corrected`}
              className="font-ui text-[12px] tracking-[0.1em] uppercase font-semibold px-5 py-2.5 rounded-sm bg-redpen text-card hover:bg-[#8f2e24] transition-colors"
            >
              Download Clean Copy
            </a>
          )}
        </div>

        {doc.status === "failed" && (
          <div className="bg-card border-l-4 border-redpen rounded-sm p-5 mb-6 font-serif text-ink/80">
            The desk couldn't finish reading this one: {doc.errorMessage}
          </div>
        )}

        {doc.status === "completed" && (
          <>
            <div className="flex gap-8 mb-6 border-b border-rule">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`font-ui text-[12px] tracking-[0.15em] uppercase font-semibold pb-3 border-b-2 -mb-px transition-colors ${
                    tab === t.key
                      ? "border-redpen text-ink"
                      : "border-transparent text-ink/40 hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Marked PDF stays mounted across tab switches so it isn't re-fetched every time */}
            <div className={tab === "marked" ? "" : "hidden"}>
              <PdfViewer
                ref={pdfViewerRef}
                documentId={doc._id}
                mistakes={doc.mistakes}
                pages={doc.pages}
                visible={tab === "marked"}
              />
              <div className="flex flex-wrap gap-6 mt-4 font-ui text-[11px] tracking-wide uppercase text-ink/50">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-redpen" />
                  Spelling
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-brass" />
                  Grammar
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-[#4B5A66]" />
                  Other
                </span>
              </div>
            </div>

            {tab === "clean" && (
              <div className="bg-card rounded-sm shadow-sm p-8 sm:p-12">
                <div className="article-body font-serif text-[17px] text-ink/90 whitespace-pre-wrap leading-relaxed">
                  {doc.correctedText}
                </div>
              </div>
            )}

            {tab === "proof" && (
              <div className="space-y-3">
                {doc.mistakes.length === 0 && (
                  <div className="bg-card rounded-sm shadow-sm p-8 text-center">
                    <p className="font-display text-xl text-greenpen">Clean copy — no slips found.</p>
                  </div>
                )}
                {doc.mistakes.map((m, idx) => (
                  <div
                    key={idx}
                    className="bg-card rounded-sm shadow-sm p-5 flex items-start gap-4"
                  >
                    <span className="font-mono text-xs text-ink/30 mt-0.5 w-6 shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span
                          className={`font-ui text-[10px] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 border rounded-sm ${categoryTagClass(
                            m.category
                          )}`}
                        >
                          {m.category || "OTHER"}
                        </span>
                        {m.boxes?.length > 0 && (
                          <button
                            onClick={() => showOnPdf(idx)}
                            className="font-ui text-[10px] tracking-[0.1em] uppercase font-semibold text-ink/50 hover:text-redpen"
                          >
                            Show on PDF →
                          </button>
                        )}
                      </div>
                      <p className="font-mono text-sm mb-1.5">
                        <span className="text-redpen line-through decoration-2">
                          {m.originalText}
                        </span>
                        {m.appliedSuggestion && (
                          <span className="text-greenpen font-semibold ml-3">
                            → {m.appliedSuggestion}
                          </span>
                        )}
                      </p>
                      <p className="font-serif text-[13px] text-ink/60">{m.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
