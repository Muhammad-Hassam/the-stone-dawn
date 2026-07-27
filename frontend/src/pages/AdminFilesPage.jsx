import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import { engineLabel } from "../utils/engineLabels";

function StatusTag({ status }) {
  const map = {
    completed: "text-greenpen border-greenpen",
    processing: "text-brass border-brass",
    pending: "text-muted border-rule",
    failed: "text-redpen border-redpen",
  };
  return (
    <span
      className={`font-ui text-[10px] uppercase font-medium px-2 py-0.5 border rounded-sm ${
        map[status] || map.pending
      }`}
    >
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

  const fetchFiles = async (searchTerm = search, uid = userId) => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/pdf/history", {
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
    fetchFiles();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this file?")) return;
    try {
      await axiosClient.delete(`/pdf/${id}`);
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
            fetchFiles(search, userId);
          }}
          className="flex flex-wrap gap-3 mb-6"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filename…"
            className="font-serif border border-rule rounded-md focus:border-ink bg-card px-3 py-1.5 text-sm w-56 outline-none"
          />
          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              fetchFiles(search, e.target.value);
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
        {!loading && items.length === 0 && (
          <p className="font-serif text-muted">No files match this filter.</p>
        )}

        <div className="divide-y divide-rule border border-rule rounded-md">
          {items.map((doc) => (
            <div key={doc._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link
                  to={`/document/${doc._id}`}
                  className="font-display text-base text-ink hover:text-accent transition-colors"
                >
                  {doc.originalName}
                </Link>
                <p className="font-ui text-[12px] text-muted mt-1">
                  {doc.uploadedBy?.name || "Unknown"} ({doc.uploadedBy?.email || "—"}) &middot;{" "}
                  {new Date(doc.createdAt).toLocaleDateString()} &middot;{" "}
                  {doc.mistakeCount ?? 0} slip(s)
                  {doc.status === "completed" &&
                    ` · S:${doc.spellingCount ?? 0} G:${doc.grammarCount ?? 0} P:${doc.punctuationCount ?? 0}`}
                  {" · "}
                  {engineLabel(doc.checkerEngine)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusTag status={doc.status} />
                <Link
                  to={`/document/${doc._id}`}
                  className="font-ui text-[13px] font-medium text-accent hover:underline"
                >
                  Open
                </Link>
                <button
                  onClick={() => handleDelete(doc._id)}
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
