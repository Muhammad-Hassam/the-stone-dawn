import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import { engineLabel } from "../utils/engineLabels";

function StatusTag({ status }) {
  const map = {
    completed: "text-greenpen border-greenpen",
    processing: "text-brass border-brass",
    failed: "text-redpen border-redpen",
  };
  return (
    <span className={`font-ui text-[10px] uppercase font-medium px-2 py-0.5 border rounded-sm ${map[status] || map.processing}`}>
      {status}
    </span>
  );
}

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchHistory = async (searchTerm = "") => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/editions/history", {
        params: { search: searchTerm, limit: 50 },
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
    if (!confirm("Delete this edition and all its pages permanently?")) return;
    try {
      await axiosClient.delete(`/editions/${id}`);
      toast.success("Deleted");
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto px-6 pt-14 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="font-display text-3xl text-ink">History</h1>
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
              placeholder="Search section…"
              className="font-serif border border-rule rounded-md bg-card px-3 py-1.5 text-sm w-48 outline-none focus:border-ink"
            />
            <button className="font-ui text-[13px] font-medium px-4 py-1.5 border border-rule rounded-md text-ink hover:border-ink transition-colors">
              Search
            </button>
          </form>
        </div>

        {loading && <p className="font-serif text-muted">Loading…</p>}
        {!loading && items.length === 0 && <p className="font-serif text-ink/80">No proofs yet.</p>}

        <div className="divide-y divide-rule">
          {items.map((ed) => (
            <div key={ed._id} className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  to={`/edition/${ed._id}`}
                  className="font-display text-lg text-ink hover:text-accent transition-colors"
                >
                  {ed.section} — {new Date(ed.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </Link>
                <p className="font-ui text-[12px] text-muted mt-1">
                  {ed.pageCount ?? 0} page(s)
                  {"  ·  "}
                  {ed.mistakeCount ?? 0} slip(s)
                  {"  ·  "}
                  S:{ed.spellingCount ?? 0} G:{ed.grammarCount ?? 0} P:{ed.punctuationCount ?? 0}
                  {"  ·  "}
                  {engineLabel(ed.checkerEngine)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusTag status={ed.status} />
                <Link
                  to={`/edition/${ed._id}`}
                  className="font-ui text-[13px] font-medium text-accent hover:underline"
                >
                  Open
                </Link>
                <button
                  onClick={() => handleDelete(ed._id)}
                  className="font-ui text-[13px] text-muted hover:text-redpen"
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
