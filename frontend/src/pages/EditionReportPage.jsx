import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import DocumentReport from "../components/DocumentReport";
import { engineLabel } from "../utils/engineLabels";

export default function EditionReportPage() {
  const { id } = useParams();
  const [edition, setEdition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);

  const fetchEdition = async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get(`/editions/${id}`);
      setEdition(data.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEdition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-paper">
        <p className="font-ui text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-paper">
        <p className="font-serif text-muted">This edition could not be found.</p>
      </div>
    );
  }

  const files = edition.files || [];
  const currentFile = files[pageIndex];

  const statusColor =
    edition.status === "completed"
      ? "text-greenpen"
      : edition.status === "failed"
      ? "text-redpen"
      : "text-brass";

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-24">
        <Link to="/history" className="font-ui text-[13px] text-muted hover:text-ink">
          ← History
        </Link>

        {/* Edition-level header */}
        <div className="flex items-start justify-between gap-6 mt-4 mb-6 border-b border-rule pb-6">
          <div>
            <p className="font-ui text-[11px] text-muted mb-1">{edition.section}</p>
            <h1 className="font-display text-2xl sm:text-3xl text-ink leading-tight mb-2">
              Edition Report
            </h1>
            <p className="font-ui text-[13px] text-muted">
              <span className={`font-medium ${statusColor}`}>{edition.status}</span>
              {"  ·  "}
              {edition.pageCount} page{edition.pageCount === 1 ? "" : "s"}
              {"  ·  "}
              {edition.mistakeCount} total slip{edition.mistakeCount === 1 ? "" : "s"}
              {"  ·  "}
              {new Date(edition.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {edition.uploadedBy?.name && (
                <>
                  {"  ·  filed by "}
                  {edition.uploadedBy.name}
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm text-redpen border-redpen">
                {edition.spellingCount || 0} Spelling
              </span>
              <span className="font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm text-brass border-brass">
                {edition.grammarCount || 0} Grammar
              </span>
              <span className="font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm text-punct border-punct">
                {edition.punctuationCount || 0} Punctuation
              </span>
              <span className="font-ui text-[11px] text-muted ml-1">
                checked by {engineLabel(edition.checkerEngine)}
              </span>
              {edition.liveFactCheck && (
                <span className="font-ui text-[11px] font-medium px-2 py-0.5 border rounded-sm text-brass border-brass">
                  Fact-check requested
                </span>
              )}
            </div>
          </div>

          <Link
            to={`/edition/${edition._id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-ui text-[13px] font-medium px-4 py-2 rounded-md border border-rule text-ink hover:border-ink transition-colors shrink-0"
          >
            Print Fix List
          </Link>
        </div>

        {files.length === 0 && (
          <p className="font-serif text-muted">No pages in this edition.</p>
        )}

        {files.length > 0 && (
          <>
            {/* page navigator */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                disabled={pageIndex === 0}
                className="font-ui text-[13px] font-medium px-4 py-2 border border-rule rounded-md text-ink disabled:opacity-30 hover:border-ink transition-colors"
              >
                ‹ Prev
              </button>

              <div className="flex items-center gap-2 overflow-x-auto max-w-md">
                {files.map((f, i) => (
                  <button
                    key={f.pdfDocument?._id || i}
                    onClick={() => setPageIndex(i)}
                    className={`font-mono text-xs w-7 h-7 shrink-0 flex items-center justify-center rounded-sm border transition-colors ${
                      i === pageIndex
                        ? "bg-ink text-card border-ink"
                        : "border-rule text-muted hover:border-ink"
                    }`}
                    title={f.pdfDocument?.originalName}
                  >
                    {f.pageNumber}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPageIndex((i) => Math.min(files.length - 1, i + 1))}
                disabled={pageIndex === files.length - 1}
                className="font-ui text-[13px] font-medium px-4 py-2 border border-rule rounded-md text-ink disabled:opacity-30 hover:border-ink transition-colors"
              >
                Next ›
              </button>
            </div>

            <p className="font-ui text-[12px] text-muted text-center mb-6">
              Page {currentFile.pageNumber} &middot; file {pageIndex + 1} of {files.length}
            </p>

            {currentFile.pdfDocument?._id && (
              <DocumentReport
                key={currentFile.pdfDocument._id}
                documentId={currentFile.pdfDocument._id}
                backTo={null}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
