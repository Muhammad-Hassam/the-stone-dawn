import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";

function categoryColor(category) {
  const c = (category || "").toUpperCase();
  if (c.includes("SPELL")) return "#B23A2E";
  if (c.includes("GRAMMAR")) return "#A3872E";
  if (c.includes("PUNCT")) return "#3B6E91";
  return "#8A8A85";
}

export default function PrintFixListPage() {
  const { id } = useParams();
  const [edition, setEdition] = useState(null);
  const [pages, setPages] = useState([]); // [{ pageNumber, originalName, mistakes }]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: editionRes } = await axiosClient.get(`/editions/${id}`);
        if (cancelled) return;
        setEdition(editionRes.data);

        const files = editionRes.data.files || [];
        const details = await Promise.all(
          files.map(async (f) => {
            if (!f.pdfDocument?._id) return null;
            const { data } = await axiosClient.get(`/pdf/${f.pdfDocument._id}`);
            return {
              pageNumber: f.pageNumber,
              originalName: data.data.originalName,
              mistakes: data.data.mistakes || [],
            };
          })
        );
        if (!cancelled) setPages(details.filter(Boolean));
      } catch {
        // quiet — this is a best-effort print view
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <p style={{ fontFamily: "sans-serif", padding: 40 }}>Loading fix list…</p>;
  }
  if (!edition) {
    return <p style={{ fontFamily: "sans-serif", padding: 40 }}>Edition not found.</p>;
  }

  const totalMistakes = pages.reduce((sum, p) => sum + p.mistakes.length, 0);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", fontFamily: "Georgia, serif", color: "#1A1A1A" }}>
      <style>{`
        @media print {
          .no-print { display: none; }
          body { background: white; }
        }
      `}</style>

      <button
        onClick={() => window.print()}
        className="no-print"
        style={{
          fontFamily: "sans-serif",
          fontSize: 13,
          fontWeight: 500,
          padding: "8px 16px",
          borderRadius: 6,
          background: "#1A1A1A",
          color: "white",
          border: "none",
          cursor: "pointer",
          marginBottom: 24,
        }}
      >
        Print / Save as PDF
      </button>

      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Fix List — {edition.section}</h1>
      <p style={{ fontFamily: "sans-serif", fontSize: 13, color: "#666", marginBottom: 32 }}>
        {new Date(edition.createdAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        {"  ·  "}
        {pages.length} page(s){"  ·  "}
        {totalMistakes} total slip(s)
      </p>

      {pages.map((p) => (
        <div key={p.pageNumber} style={{ marginBottom: 32, breakInside: "avoid" }}>
          <h2 style={{ fontSize: 18, borderBottom: "1px solid #ddd", paddingBottom: 6, marginBottom: 12 }}>
            Page {p.pageNumber} — {p.originalName}
          </h2>

          {p.mistakes.length === 0 ? (
            <p style={{ fontFamily: "sans-serif", fontSize: 13, color: "#3F6F52" }}>
              No slips found — clean copy.
            </p>
          ) : (
            <ol style={{ paddingLeft: 20 }}>
              {p.mistakes.map((m, idx) => (
                <li key={idx} style={{ marginBottom: 8, fontSize: 14 }}>
                  <span
                    style={{
                      fontFamily: "sans-serif",
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: categoryColor(m.category),
                      border: `1px solid ${categoryColor(m.category)}`,
                      borderRadius: 3,
                      padding: "1px 6px",
                      marginRight: 8,
                    }}
                  >
                    {m.category || "OTHER"}
                  </span>
                  <span style={{ fontFamily: "monospace", textDecoration: "line-through", color: "#B23A2E" }}>
                    {m.originalText}
                  </span>
                  {m.appliedSuggestion && (
                    <span style={{ fontFamily: "monospace", color: "#3F6F52", marginLeft: 8 }}>
                      → {m.appliedSuggestion}
                    </span>
                  )}
                  <div style={{ fontFamily: "sans-serif", fontSize: 12, color: "#666", marginTop: 2 }}>
                    {m.message}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
