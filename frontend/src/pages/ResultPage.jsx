import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import PdfViewer from "../components/PdfViewer";
import { downloadAuthedFile } from "../utils/downloadAuthedFile";
import { engineLabel } from "../utils/engineLabels";

const TABS = [
  { key: "marked", label: "Marked PDF" },
  { key: "clean", label: "Clean Copy" },
  { key: "proof", label: "Proof Sheet" },
];

function categoryTagClass(category) {
  const c = (category || "").toUpperCase();
  if (c.includes("SPELL") || c.includes("TYPO")) return "text-redpen border-redpen";
  if (c.includes("GRAMMAR")) return "text-brass border-brass";
  if (c.includes("PUNCT")) return "text-punct border-punct";
  return "text-muted border-rule";
}

export default function ResultPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("marked");
  const [downloading, setDownloading] = useState(""); // "" | "original" | "corrected"
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
      <div className="min-h-[60vh] flex items-center justify-center bg-paper">
        <p className="font-ui text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-paper">
        <p className="font-serif text-muted">This proof could not be found.</p>
      </div>
    );
  }

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

  const handleDownload = async (kind) => {
    setDownloading(kind);
    try {
      const filename =
        kind === "corrected" ? `corrected-${doc.originalName}` : doc.originalName;
      await downloadAuthedFile(`/pdf/${doc._id}/download/${kind}`, filename);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading("");
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-24">
        <Link to="/history" className="font-ui text-[13px] text-muted hover:text-ink">
          &larr; History
        </Link>

        {/* Byline block */}
        <div className="flex items-start justify-between gap-6 mt-4 mb-6 border-b border-rule pb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-ink leading-tight mb-2">
              {doc.originalName}
            </h1>
            <p className="font-ui text-[13px] text-muted">
              <span className={`font-medium ${statusColor}`}>{doc.status}</span>
              {"  ·  "}
              {doc.mistakeCount} slip{doc.mistakeCount === 1 ? "" : "s"}
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

            {doc.status === "completed" && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm text-redpen border-redpen">
                  {doc.spellingCount || 0} Spelling
                </span>
                <span className="font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm text-brass border-brass">
                  {doc.grammarCount || 0} Grammar
                </span>
                <span className="font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm text-punct border-punct">
                  {doc.punctuationCount || 0} Punctuation
                </span>
                <span className="font-ui text-[11px] text-muted ml-1">
                  checked by {engineLabel(doc.checkerEngine)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => handleDownload("original")}
            disabled={downloading === "original"}
            className="font-ui text-[13px] font-medium px-4 py-2 rounded-md border border-rule text-ink hover:border-ink transition-colors disabled:opacity-50"
          >
            {downloading === "original" ? "Preparing…" : "Original Scan"}
          </button>
          {doc.correctedPath && (
            <button
              onClick={() => handleDownload("corrected")}
              disabled={downloading === "corrected"}
              className="font-ui text-[13px] font-medium px-4 py-2 rounded-md bg-ink text-card hover:opacity-85 transition-opacity disabled:opacity-50"
            >
              {downloading === "corrected" ? "Preparing…" : "Download Clean Copy"}
            </button>
          )}
        </div>

        {doc.status === "failed" && (
          <div className="bg-card border-l-2 border-redpen rounded-sm p-4 mb-6 font-serif text-ink/80">
            The desk couldn't finish reading this one: {doc.errorMessage}
          </div>
        )}

        {doc.status === "completed" && (
          <>
            <div className="flex gap-6 mb-6 border-b border-rule">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`font-ui text-[13px] font-medium pb-3 border-b-2 -mb-px transition-colors ${
                    tab === t.key
                      ? "border-ink text-ink"
                      : "border-transparent text-muted hover:text-ink"
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
              <div className="flex flex-wrap gap-6 mt-4 font-ui text-[12px] text-muted">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-redpen" />
                  Spelling
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-brass" />
                  Grammar
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-punct" />
                  Punctuation
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-muted" />
                  Other
                </span>
              </div>
            </div>

            {tab === "clean" && (
              <div className="bg-card border border-rule rounded-md p-6 sm:p-10">
                <div className="article-body font-serif text-[16px] text-ink/90 whitespace-pre-wrap leading-relaxed">
                  {doc.correctedText}
                </div>
              </div>
            )}

            {tab === "proof" && (
              <div className="space-y-2">
                {doc.mistakes.length === 0 && (
                  <div className="bg-card border border-rule rounded-md p-8 text-center">
                    <p className="font-display text-xl text-greenpen">Clean copy — no slips found.</p>
                  </div>
                )}
                {doc.mistakes.map((m, idx) => (
                  <div
                    key={idx}
                    className="bg-card border border-rule rounded-md p-4 flex items-start gap-4"
                  >
                    <span className="font-mono text-xs text-muted mt-0.5 w-6 shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5">
                        <span
                          className={`font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm ${categoryTagClass(
                            m.category
                          )}`}
                        >
                          {m.category || "OTHER"}
                        </span>
                        {m.boxes?.length > 0 && (
                          <button
                            onClick={() => showOnPdf(idx)}
                            className="font-ui text-[11px] font-medium text-accent hover:underline"
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
                      <p className="font-serif text-[13px] text-muted">{m.message}</p>
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
