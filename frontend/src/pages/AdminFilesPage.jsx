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

export default function AdminFilesPage() {
  const [items, setItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");

  const fetchStaff = async () => {
    try {
      const { data } = await axiosClient.get("/auth/users");
      setStaff(data.data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const fetchEditions = async (searchTerm = search, uid = userId) => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/editions/history", {
        params: { search: searchTerm, userId: uid || undefined, limit: 100 },
      });
      setItems(data.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchEditions();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this edition and all its pages?")) return;
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
        <h1 className="font-display text-3xl text-ink mb-8">All Copy</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchEditions(search, userId);
          }}
          className="flex flex-wrap gap-3 mb-6"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search section…"
            className="font-serif border border-rule rounded-md focus:border-ink bg-card px-3 py-1.5 text-sm w-56 outline-none"
          />
          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              fetchEditions(search, e.target.value);
            }}
            className="font-serif border border-rule rounded-md focus:border-ink bg-card px-3 py-1.5 text-sm outline-none"
          >
            <option value="">All staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button className="font-ui text-[13px] font-medium px-4 py-1.5 border border-rule rounded-md text-ink hover:border-ink transition-colors">
            Filter
          </button>
        </form>

        {loading && <p className="font-serif text-muted">Loading…</p>}
        {!loading && items.length === 0 && <p className="font-serif text-muted">No editions match this filter.</p>}

        <div className="divide-y divide-rule border border-rule rounded-md">
          {items.map((ed) => (
            <div key={ed._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link
                  to={`/edition/${ed._id}`}
                  className="font-display text-base text-ink hover:text-accent transition-colors"
                >
                  {ed.section} — {new Date(ed.createdAt).toLocaleDateString()}
                </Link>
                <p className="font-ui text-[12px] text-muted mt-1">
                  {ed.uploadedBy?.name || "Unknown"} ({ed.uploadedBy?.email || "—"}) &middot;{" "}
                  {ed.pageCount ?? 0} page(s) &middot; {ed.mistakeCount ?? 0} slip(s)
                  {" · "}
                  S:{ed.spellingCount ?? 0} G:{ed.grammarCount ?? 0} P:{ed.punctuationCount ?? 0}
                  {" · "}
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
