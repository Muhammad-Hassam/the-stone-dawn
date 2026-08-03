import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import PdfViewer from "./PdfViewer";
import { downloadAuthedFile } from "../utils/downloadAuthedFile";
import { engineLabel } from "../utils/engineLabels";

function categoryTagClass(category) {
  const c = (category || "").toUpperCase();
  if (c.includes("SPELL") || c.includes("TYPO")) return "text-redpen border-redpen";
  if (c.includes("GRAMMAR")) return "text-brass border-brass";
  if (c.includes("PUNCT")) return "text-punct border-punct";
  if (c.includes("HALLUCINATION")) return "text-accent border-accent";
  if (c.includes("SENSITIVE")) return "text-sensitive border-sensitive";
  return "text-muted border-rule";
}

const CONFIDENCE_LABEL = { low: "Low confidence", medium: "Medium confidence", high: "High confidence" };
const HALLUCINATION_CATEGORY_LABEL = {
  fabricated_statistic: "Fabricated Statistic",
  invented_quote: "Invented Quote",
  unverifiable_claim: "Unverifiable Claim",
  contradiction: "Contradiction",
  generic_ai_phrasing: "Generic AI Phrasing",
  other: "Other",
};
const SEVERITY_LABEL = { low: "Low severity", medium: "Medium severity", high: "High severity" };
const SENSITIVE_CATEGORY_LABEL = {
  graphic_violence: "Graphic Violence",
  hate_speech: "Hate Speech",
  personal_identifiable_info: "Personal Info (PII)",
  vulnerable_individual: "Vulnerable Individual",
  self_harm_detail: "Self-Harm Detail",
  profanity: "Profanity",
  unverified_accusation: "Unverified Accusation",
  other: "Other",
};

/**
 * Renders the full report for a single processed PDF: byline, download
 * buttons, and the Marked PDF / Clean Copy / Proof Sheet tabs, plus
 * Summary / Hallucinations tabs when those AI extras were requested. Used
 * both directly (ResultPage, for a single standalone file) and embedded
 * inside EditionReportPage (which adds a page navigator above it and swaps
 * `documentId` when you click Next/Prev).
 */
export default function DocumentReport({
  documentId,
  backTo = "/history",
  backLabel = "← History",
  headerSlot = null,
  onLoaded,
}) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("marked");
  const [downloading, setDownloading] = useState("");
  const pdfViewerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTab("marked");
    (async () => {
      try {
        const { data } = await axiosClient.get(`/pdf/${documentId}`);
        if (!cancelled) {
          setDoc(data.data);
          onLoaded?.(data.data);
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // Hallucination flags share the exact same {offset, length, boxes} shape
  // as mistakes, so they can be pinned on the Marked PDF for free by just
  // appending them (with a HALLUCINATION category) to the same array the
  // viewer already knows how to render and jump to.
  const combinedMarks = useMemo(() => {
    if (!doc) return [];
    const hallucinationMarks = (doc.hallucinationFlags || []).map((f) => ({
      originalText: f.text,
      message: f.reason,
      appliedSuggestion: "",
      category: "HALLUCINATION",
      boxes: f.boxes,
    }));
    const sensitiveMarks = (doc.sensitiveFlags || []).map((f) => ({
      originalText: f.text,
      message: f.reason,
      appliedSuggestion: "",
      category: "SENSITIVE",
      boxes: f.boxes,
    }));
    return [...(doc.mistakes || []), ...hallucinationMarks, ...sensitiveMarks];
  }, [doc]);

  const TABS = useMemo(() => {
    const tabs = [
      { key: "marked", label: "Marked PDF" },
      { key: "clean", label: "Clean Copy" },
      { key: "proof", label: "Proof Sheet" },
    ];
    if (doc?.summaryRequested) tabs.push({ key: "summary", label: "Summary" });
    if (doc?.hallucinationCheckRequested) tabs.push({ key: "hallucinations", label: "Hallucinations" });
    if (doc?.sensitiveCheckRequested) tabs.push({ key: "sensitive", label: "Sensitive Content" });
    return tabs;
  }, [doc]);

  if (loading) {
    return <p className="font-ui text-sm text-muted py-10 text-center">Loading…</p>;
  }

  if (!doc) {
    return <p className="font-serif text-muted py-10 text-center">This proof could not be found.</p>;
  }

  const statusColor =
    doc.status === "completed"
      ? "text-greenpen"
      : doc.status === "failed"
      ? "text-redpen"
      : "text-brass";

  const showOnPdf = (idx) => {
    setTab("marked");
    setTimeout(() => pdfViewerRef.current?.goToMistake(idx), 50);
  };

  const handleDownload = async (kind) => {
    setDownloading(kind);
    try {
      const filename = kind === "corrected" ? `corrected-${doc.originalName}` : doc.originalName;
      await downloadAuthedFile(`/pdf/${doc._id}/download/${kind}`, filename);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading("");
    }
  };

  const mistakeCount = doc.mistakes?.length || 0;

  return (
    <div>
      {backTo && (
        <Link to={backTo} className="font-ui text-[13px] text-muted hover:text-ink">
          {backLabel}
        </Link>
      )}

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
              {doc.hallucinationCheckRequested && (
                <span className="font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm text-accent border-accent">
                  {doc.hallucinationCount || 0} Hallucination flag(s)
                </span>
              )}
              {doc.sensitiveCheckRequested && (
                <span className="font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm text-sensitive border-sensitive">
                  {doc.sensitiveFlagCount || 0} Sensitive flag(s)
                </span>
              )}
              <span className="font-ui text-[11px] text-muted ml-1">
                checked by {engineLabel(doc.checkerEngine)}
              </span>
            </div>
          )}
        </div>
      </div>

      {headerSlot}

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

      {doc.aiExtrasError && (
        <div className="bg-card border-l-2 border-brass rounded-sm p-4 mb-6 font-serif text-ink/80 text-[14px]">
          AI extras (hallucination check / summary) didn't complete: {doc.aiExtrasError}
        </div>
      )}

      {doc.status === "completed" && (
        <>
          <div className="flex gap-6 mb-6 border-b border-rule flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`font-ui text-[13px] font-medium pb-3 border-b-2 -mb-px transition-colors ${
                  tab === t.key ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className={tab === "marked" ? "" : "hidden"}>
            <PdfViewer
              ref={pdfViewerRef}
              documentId={doc._id}
              mistakes={combinedMarks}
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
              {doc.hallucinationCheckRequested && (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent" />
                  Hallucination flag
                </span>
              )}
              {doc.sensitiveCheckRequested && (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-sensitive" />
                  Sensitive content
                </span>
              )}
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
              {mistakeCount === 0 && (
                <div className="bg-card border border-rule rounded-md p-8 text-center">
                  <p className="font-display text-xl text-greenpen">Clean copy — no slips found.</p>
                </div>
              )}
              {(doc.mistakes || []).map((m, idx) => (
                <div key={idx} className="bg-card border border-rule rounded-md p-4 flex items-start gap-4">
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
                      <span className="text-redpen line-through decoration-2">{m.originalText}</span>
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

          {tab === "summary" && (
            <div className="bg-card border border-rule rounded-md p-6 sm:p-8">
              {doc.summary ? (
                <>
                  <p className="font-serif text-[16px] text-ink/90 leading-relaxed mb-4">
                    {doc.summary}
                  </p>
                  {doc.summaryKeyPoints?.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1.5">
                      {doc.summaryKeyPoints.map((point, idx) => (
                        <li key={idx} className="font-serif text-[15px] text-ink/85">
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="font-serif text-muted">
                  No summary available{doc.aiExtrasError ? " — see the note above." : "."}
                </p>
              )}
            </div>
          )}

          {tab === "hallucinations" && (
            <div className="space-y-2">
              {(doc.hallucinationFlags || []).length === 0 && (
                <div className="bg-card border border-rule rounded-md p-8 text-center">
                  <p className="font-display text-xl text-greenpen">
                    Nothing flagged as a likely hallucination.
                  </p>
                  <p className="font-ui text-[12px] text-muted mt-2">
                    This is a heuristic scan of the text for internal red flags — not a real-world
                    fact-check against outside sources.
                  </p>
                </div>
              )}
              {(doc.hallucinationFlags || []).map((f, i) => {
                const combinedIdx = mistakeCount + i;
                return (
                  <div key={i} className="bg-card border border-rule rounded-md p-4 flex items-start gap-4">
                    <span className="font-mono text-xs text-muted mt-0.5 w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className="font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm text-accent border-accent">
                          {HALLUCINATION_CATEGORY_LABEL[f.category] || "Other"}
                        </span>
                        <span className="font-ui text-[11px] text-muted">
                          {CONFIDENCE_LABEL[f.confidence] || "Medium confidence"}
                        </span>
                        {f.boxes?.length > 0 && (
                          <button
                            onClick={() => showOnPdf(combinedIdx)}
                            className="font-ui text-[11px] font-medium text-accent hover:underline"
                          >
                            Show on PDF →
                          </button>
                        )}
                      </div>
                      <p className="font-mono text-sm mb-1.5 text-ink/90">"{f.text}"</p>
                      <p className="font-serif text-[13px] text-muted">{f.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "sensitive" && (
            <div className="space-y-2">
              {(doc.sensitiveFlags || []).length === 0 && (
                <div className="bg-card border border-rule rounded-md p-8 text-center">
                  <p className="font-display text-xl text-greenpen">
                    Nothing flagged for editorial review.
                  </p>
                </div>
              )}
              {(doc.sensitiveFlags || []).map((f, i) => {
                // Sensitive marks are appended after mistakes AND hallucination
                // marks in combinedMarks, so the jump-to index has to account
                // for however many hallucination flags came before them.
                const combinedIdx = mistakeCount + (doc.hallucinationFlags?.length || 0) + i;
                return (
                  <div key={i} className="bg-card border border-rule rounded-md p-4 flex items-start gap-4">
                    <span className="font-mono text-xs text-muted mt-0.5 w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className="font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm text-sensitive border-sensitive">
                          {SENSITIVE_CATEGORY_LABEL[f.category] || "Other"}
                        </span>
                        <span className="font-ui text-[11px] text-muted">
                          {SEVERITY_LABEL[f.severity] || "Medium severity"}
                        </span>
                        {f.boxes?.length > 0 && (
                          <button
                            onClick={() => showOnPdf(combinedIdx)}
                            className="font-ui text-[11px] font-medium text-sensitive hover:underline"
                          >
                            Show on PDF →
                          </button>
                        )}
                      </div>
                      <p className="font-mono text-sm mb-1.5 text-ink/90">"{f.text}"</p>
                      <p className="font-serif text-[13px] text-muted">{f.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
