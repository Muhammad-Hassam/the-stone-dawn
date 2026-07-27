import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import UploadDropzone from "../components/UploadDropzone";
import { engineLabel } from "../utils/engineLabels";

let nextId = 1;

const STATUS_LABEL = {
  queued: "Queued",
  uploading: "Reading…",
  done: "Marked",
  error: "Failed"
};

const STATUS_CLASS = {
  queued: "text-muted border-rule",
  uploading: "text-brass border-brass",
  done: "text-greenpen border-greenpen",
  error: "text-redpen border-redpen"
};

const ENGINE_INFO = {
  languagetool:
    "Sent to the LanguageTool API. Catches spelling, grammar & punctuation, but can misfire on unusual names or phrasing.",
  "ai-gemini":
    "Sent to Gemini for review. Requires GEMINI_API_KEY on the server.",
  "ai-chatgpt":
    "Sent to ChatGPT for review. Requires OPENAI_API_KEY on the server.",
  "offline-spellcheck":
    "Checked locally with an offline Hunspell dictionary — no API key, no network call. Spelling only, and may flag names or non-US spellings it doesn't recognize."
};

export default function UploadPage() {
  const [queue, setQueue] = useState([]); // [{ id, file, status, error, resultId }]
  const [engine, setEngine] = useState("languagetool");
  const [uploading, setUploading] = useState(false);
  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const formRef = useRef(null);

  const fetchRecent = async () => {
    setRecentLoading(true);
    try {
      const { data } = await axiosClient.get("/pdf/history", {
        params: { limit: 5 }
      });
      setRecent(data.data);
    } catch {
      // quiet failure here — this is just a convenience preview, History page has the full list
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  const addFiles = (files) => {
    const items = files.map((file) => ({
      id: nextId++,
      file,
      status: "queued",
      error: "",
      resultId: null
    }));
    setQueue((prev) => [...prev, ...items]);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    setQueue((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index) => {
    setQueue((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      return next;
    });
  };

  const removeItem = (id) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearFinished = () => {
    setQueue((prev) => prev.filter((item) => item.status === "queued"));
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const uploadAll = async () => {
    const pending = queue.filter(
      (item) => item.status === "queued" || item.status === "error"
    );
    if (pending.length === 0) {
      toast.warn("Add at least one PDF to the queue first");
      return;
    }

    setUploading(true);

    for (const item of queue) {
      if (item.status === "done") continue;

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "uploading", error: "" } : q
        )
      );

      try {
        const formData = new FormData();
        formData.append("pdf", item.file);
        formData.append("engine", engine);

        const { data } = await axiosClient.post("/pdf/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        if (data.data.status === "failed") {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: "error",
                    error: data.data.errorMessage || "Processing failed"
                  }
                : q
            )
          );
        } else {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: "done", resultId: data.data._id }
                : q
            )
          );
        }
      } catch (err) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "error", error: err.message } : q
          )
        );
      }
    }

    setUploading(false);
    fetchRecent();
    toast.success("Queue processed");
  };

  const doneCount = queue.filter((q) => q.status === "done").length;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto px-6 pt-14 pb-24">
        {/* header row, matching reference: heading + primary CTA */}
        <div className="flex items-center justify-between mb-10">
          <h2 className="font-display text-3xl text-ink">Proof an edition</h2>
          <button
            onClick={scrollToForm}
            className="font-ui text-sm font-medium bg-ink text-card px-4 py-2 rounded-md hover:opacity-85 transition-opacity"
          >
            + New proof
          </button>
        </div>

        {/* Recent preview */}
        <div className="mb-12">
          <p className="font-ui text-[11px] tracking-[0.15em] uppercase text-muted mb-3">
            Recent
          </p>

          {recentLoading && (
            <p className="font-serif text-muted text-sm">Loading…</p>
          )}

          {!recentLoading && recent.length === 0 && (
            <p className="font-serif text-ink/80 text-[15px]">
              No proofs yet. Start one with{" "}
              <button
                onClick={scrollToForm}
                className="text-accent hover:underline"
              >
                New proof
              </button>
              .
            </p>
          )}

          {!recentLoading && recent.length > 0 && (
            <div className="divide-y divide-rule">
              {recent.map((doc) => (
                <Link
                  key={doc._id}
                  to={`/document/${doc._id}`}
                  className="flex items-center justify-between py-3 group"
                >
                  <span className="font-serif text-[15px] text-ink group-hover:text-accent transition-colors truncate">
                    {doc.originalName}
                  </span>
                  <span className="font-ui text-[12px] text-muted shrink-0 ml-4">
                    {doc.mistakeCount ?? 0} slip(s) &middot;{" "}
                    {engineLabel(doc.checkerEngine)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upload form */}
        <div ref={formRef} className="border-t border-rule pt-10">
          <p className="font-ui text-[11px] tracking-[0.15em] uppercase text-muted mb-4">
            New Proof
          </p>

          <div className="mb-5">
            <label className="block font-ui text-[12px] text-muted mb-1.5">
              Proofreader
            </label>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              disabled={uploading}
              className="font-serif border border-rule rounded-md bg-card px-3 py-2 text-sm outline-none disabled:opacity-50 w-full sm:w-auto"
            >
              <option value="languagetool">
                LanguageTool — spelling &amp; grammar
              </option>
              <option value="ai-gemini">AI Review — Gemini</option>
              <option value="ai-chatgpt">AI Review — ChatGPT</option>
              <option value="offline-spellcheck">
                Offline Dictionary — spelling only
              </option>
            </select>
            <p className="font-ui text-[12px] text-muted mt-1.5 max-w-md">
              {ENGINE_INFO[engine]}
            </p>
          </div>

          <UploadDropzone onFilesSelected={addFiles} disabled={uploading} />

          {queue.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-ui text-[13px] font-medium text-ink">
                  Queue
                  <span className="font-ui text-[12px] text-muted ml-2">
                    ({doneCount}/{queue.length} marked)
                  </span>
                </h3>
                {!uploading && doneCount > 0 && (
                  <button
                    onClick={clearFinished}
                    className="font-ui text-[12px] text-muted hover:text-ink"
                  >
                    Clear finished
                  </button>
                )}
              </div>

              <div className="divide-y divide-rule border border-rule rounded-md">
                {queue.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-3">
                    <span className="font-mono text-xs text-muted w-6 shrink-0">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="flex flex-col shrink-0">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={uploading || index === 0}
                        className="text-muted hover:text-ink disabled:opacity-20 disabled:cursor-not-allowed leading-none text-sm px-1"
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={uploading || index === queue.length - 1}
                        className="text-muted hover:text-ink disabled:opacity-20 disabled:cursor-not-allowed leading-none text-sm px-1"
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-ink text-sm truncate">
                        {item.file.name}
                      </p>
                      <p className="font-ui text-[11px] text-muted mt-0.5">
                        {(item.file.size / 1024).toFixed(1)} KB
                        {item.status === "error" && item.error
                          ? ` · ${item.error}`
                          : ""}
                      </p>
                    </div>

                    <span
                      className={`font-ui text-[10px] uppercase font-medium px-2 py-0.5 border rounded-sm shrink-0 ${STATUS_CLASS[item.status]}`}
                    >
                      {STATUS_LABEL[item.status]}
                    </span>

                    {item.status === "done" && item.resultId ? (
                      <Link
                        to={`/document/${item.resultId}`}
                        className="font-ui text-[12px] font-medium text-accent hover:underline shrink-0"
                      >
                        Open
                      </Link>
                    ) : (
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={uploading && item.status === "uploading"}
                        className="font-ui text-[12px] text-muted hover:text-redpen disabled:opacity-20 shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={uploadAll}
            disabled={queue.length === 0 || uploading}
            className="mt-6 font-ui text-sm font-medium bg-ink text-card disabled:bg-muted/40 disabled:cursor-not-allowed px-5 py-2.5 rounded-md hover:opacity-85 transition-opacity"
          >
            {uploading
              ? "Reading…"
              : `Submit ${queue.length > 1 ? `${queue.length} files` : "proof"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
