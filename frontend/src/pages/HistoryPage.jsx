import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import { engineLabel } from "../utils/engineLabels";

function StatusTag({ status }) {
  const map = {
    completed: "text-greenpen border-greenpen",
    processing: "text-brass border-brass",
    pending: "text-ink/50 border-ink/30",
    failed: "text-redpen border-redpen",
  };
  return (
    <span
      className={`font-ui text-[10px] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 border rounded-sm ${
        map[status] || map.pending
      }`}
    >
      {status}
    </span>
  );
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchHistory = async (searchTerm = "") => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/pdf/history", {
        params: { search: searchTerm, limit: 50, userId: user.id },
      });
      setItems(data.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Pull this edition from the archive permanently?")) return;
    try {
      await axiosClient.delete(`/pdf/${id}`);
      toast.success("Removed from the archive");
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-paper paper-texture">
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-2 border-b-4 border-double border-ink pb-4">
          <div>
            <div className="font-ui text-[11px] tracking-[0.2em] uppercase text-redpen mb-1">
              The Archive
            </div>
            <h1 className="font-display text-3xl text-ink">Back Issues</h1>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchHistory(search);
            }}
            className="flex gap-2"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the archive…"
              className="font-serif border-b-2 border-ink/30 focus:border-redpen bg-transparent px-1 py-1.5 text-sm w-56 outline-none"
            />
            <button className="font-ui text-[11px] tracking-[0.1em] uppercase font-semibold px-4 py-1.5 border-2 border-ink text-ink hover:bg-ink hover:text-card rounded-sm transition-colors">
              Search
            </button>
          </form>
        </div>

        {loading && (
          <p className="font-serif text-ink/50 mt-8">Pulling files from the archive…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="font-serif text-ink/50 mt-8">
            No editions filed yet. Submit a PDF to start the archive.
          </p>
        )}

        <div className="divide-y divide-rule mt-2">
          {items.map((doc, idx) => (
            <div
              key={doc._id}
              className="py-5 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-start gap-4">
                <span className="font-mono text-xs text-ink/30 mt-1.5 w-8 shrink-0">
                  {String(idx + 1).padStart(3, "0")}
                </span>
                <div>
                  <Link
                    to={`/document/${doc._id}`}
                    className="font-display text-lg text-ink hover:text-redpen transition-colors"
                  >
                    {doc.originalName}
                  </Link>
                  <p className="font-ui text-[11px] tracking-wide text-ink/45 mt-1">
                    {new Date(doc.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {"  ·  "}
                    {doc.mistakeCount ?? 0} slip(s)
                    {doc.status === "completed" &&
                      `  ·  S:${doc.spellingCount ?? 0} G:${doc.grammarCount ?? 0} P:${doc.punctuationCount ?? 0}`}
                    {"  ·  "}
                    {engineLabel(doc.checkerEngine)}
                    {doc.fileSize ? `  ·  ${(doc.fileSize / 1024).toFixed(1)} KB` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <StatusTag status={doc.status} />
                <Link
                  to={`/document/${doc._id}`}
                  className="font-ui text-[11px] tracking-[0.1em] uppercase font-semibold text-ink/60 hover:text-redpen"
                >
                  Open
                </Link>
                <button
                  onClick={() => handleDelete(doc._id)}
                  className="font-ui text-[11px] tracking-[0.1em] uppercase font-semibold text-ink/40 hover:text-redpen"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
