import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";

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
    if (!confirm("Permanently delete this file from the archive?")) return;
    try {
      await axiosClient.delete(`/pdf/${id}`);
      toast.success("Deleted");
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-paper paper-texture">
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-24">
        <div className="mb-6 border-b-4 border-double border-ink pb-4">
          <div className="font-ui text-[11px] tracking-[0.2em] uppercase text-redpen mb-1">
            The Newsroom
          </div>
          <h1 className="font-display text-3xl text-ink">All Filed Copy</h1>
        </div>

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
            className="font-serif border-b-2 border-ink/30 focus:border-redpen bg-transparent px-1 py-1.5 text-sm w-56 outline-none"
          />
          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              fetchFiles(search, e.target.value);
            }}
            className="font-serif border-b-2 border-ink/30 focus:border-redpen bg-transparent px-1 py-1.5 text-sm outline-none"
          >
            <option value="">All staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button className="font-ui text-[11px] tracking-[0.1em] uppercase font-semibold px-4 py-1.5 border-2 border-ink text-ink hover:bg-ink hover:text-card rounded-sm transition-colors">
            Filter
          </button>
        </form>

        {loading && <p className="font-serif text-ink/50">Pulling files…</p>}
        {!loading && items.length === 0 && (
          <p className="font-serif text-ink/50">No files match this filter.</p>
        )}

        <div className="divide-y divide-rule bg-card rounded-sm shadow-sm">
          {items.map((doc) => (
            <div
              key={doc._id}
              className="flex flex-wrap items-center justify-between gap-3 p-5"
            >
              <div>
                <Link
                  to={`/document/${doc._id}`}
                  className="font-display text-lg text-ink hover:text-redpen transition-colors"
                >
                  {doc.originalName}
                </Link>
                <p className="font-ui text-[11px] tracking-wide text-ink/45 mt-1">
                  {doc.uploadedBy?.name || "Unknown"} ({doc.uploadedBy?.email || "—"}) &middot;{" "}
                  {new Date(doc.createdAt).toLocaleDateString()} &middot;{" "}
                  {doc.mistakeCount ?? 0} slip(s)
                </p>
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
