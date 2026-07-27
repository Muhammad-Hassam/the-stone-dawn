import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-card border border-rule rounded-md p-5 border-l-2" style={{ borderLeftColor: accent }}>
      <p className="font-ui text-[11px] text-muted mb-2">{label}</p>
      <p className="font-display text-3xl text-ink">{value}</p>
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
    <div className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto px-6 pt-14 pb-24">
        <h1 className="font-display text-3xl text-ink mb-8">Usage</h1>

        {loading && <p className="font-serif text-muted">Loading…</p>}

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
              <StatCard label="Failed Runs" value={stats.failedDocs} accent="var(--color-muted)" />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-10">
              <StatCard label="Spelling" value={stats.totalSpelling} accent="var(--color-redpen)" />
              <StatCard label="Grammar" value={stats.totalGrammar} accent="var(--color-brass)" />
              <StatCard label="Punctuation" value={stats.totalPunctuation} accent="var(--color-punct)" />
            </div>

            <h2 className="font-display text-xl text-ink mb-4">Latest Filed Copy</h2>
            <div className="divide-y divide-rule border border-rule rounded-md">
              {stats.recentDocs.length === 0 && (
                <p className="font-serif text-muted p-6">Nothing filed yet.</p>
              )}
              {stats.recentDocs.map((doc) => (
                <Link
                  key={doc._id}
                  to={`/document/${doc._id}`}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-paper transition-colors"
                >
                  <div>
                    <p className="font-display text-base text-ink">{doc.originalName}</p>
                    <p className="font-ui text-[12px] text-muted mt-1">
                      {doc.uploadedBy?.name || "Unknown"} &middot;{" "}
                      {new Date(doc.createdAt).toLocaleDateString()} &middot; {doc.mistakeCount}{" "}
                      slip(s)
                    </p>
                  </div>
                  <span className="font-ui text-[11px] text-muted">{doc.status}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
