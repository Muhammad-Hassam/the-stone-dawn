import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-card rounded-sm shadow-sm p-6 border-l-4" style={{ borderColor: accent }}>
      <p className="font-ui text-[11px] tracking-[0.15em] uppercase text-ink/50 mb-2">{label}</p>
      <p className="font-display text-4xl text-ink">{value}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosClient.get("/admin/stats");
        setStats(data.data);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-paper paper-texture">
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-24">
        <div className="mb-8 border-b-4 border-double border-ink pb-4">
          <div className="font-ui text-[11px] tracking-[0.2em] uppercase text-redpen mb-1">
            The Newsroom
          </div>
          <h1 className="font-display text-3xl text-ink">Editor's Overview</h1>
        </div>

        {loading && <p className="font-serif text-ink/50">Pulling the day's numbers…</p>}

        {stats && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <StatCard label="Staff" value={stats.totalUsers} accent="var(--color-redpen)" />
              <StatCard label="Total Copy" value={stats.totalDocuments} accent="var(--color-brass)" />
              <StatCard
                label="Slips Caught"
                value={stats.totalMistakesCaught}
                accent="var(--color-greenpen)"
              />
              <StatCard label="Failed Runs" value={stats.failedDocs} accent="#6B7A86" />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-10">
              <StatCard label="Spelling" value={stats.totalSpelling} accent="var(--color-redpen)" />
              <StatCard label="Grammar" value={stats.totalGrammar} accent="var(--color-brass)" />
              <StatCard label="Punctuation" value={stats.totalPunctuation} accent="#3B6E91" />
            </div>

            <h2 className="font-display text-2xl text-ink mb-4">Latest Filed Copy</h2>
            <div className="divide-y divide-rule bg-card rounded-sm shadow-sm">
              {stats.recentDocs.length === 0 && (
                <p className="font-serif text-ink/50 p-6">Nothing filed yet.</p>
              )}
              {stats.recentDocs.map((doc) => (
                <Link
                  key={doc._id}
                  to={`/document/${doc._id}`}
                  className="flex items-center justify-between gap-4 p-5 hover:bg-paper/50 transition-colors"
                >
                  <div>
                    <p className="font-display text-lg text-ink">{doc.originalName}</p>
                    <p className="font-ui text-[11px] tracking-wide text-ink/45 mt-1">
                      {doc.uploadedBy?.name || "Unknown"} &middot;{" "}
                      {new Date(doc.createdAt).toLocaleDateString()} &middot; {doc.mistakeCount}{" "}
                      slip(s)
                    </p>
                  </div>
                  <span className="font-ui text-[10px] uppercase tracking-wide text-ink/40">
                    {doc.status}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
