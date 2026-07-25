import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import UploadDropzone from "../components/UploadDropzone";

let nextId = 1;

const STATUS_LABEL = {
  queued: "Queued",
  uploading: "Reading…",
  done: "Marked",
  error: "Failed"
};

const STATUS_CLASS = {
  queued: "text-ink/40 border-ink/30",
  uploading: "text-brass border-brass",
  done: "text-greenpen border-greenpen",
  error: "text-redpen border-redpen"
};

const ENGINE_INFO = {
  languagetool:
    "Catches spelling, grammar & punctuation, but can misfire on unusual names or phrasing.",
  "ai-gemini":
    "Sent to Gemini for review. Requires GEMINI_API_KEY on the server.",
  "ai-chatgpt":
    "Sent to ChatGPT for review. Requires OPENAI_API_KEY on the server.",
  "offline-spellcheck":
    "Checked locally with an offline Hunspell dictionary — no API key, no network call. Spelling only (no grammar/punctuation), and may flag names or non-US spellings it doesn't recognize."
};

export default function UploadPage() {
  const [queue, setQueue] = useState([]);
  const [engine, setEngine] = useState("languagetool");
  const [uploading, setUploading] = useState(false);

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

  const uploadAll = async () => {
    const pending = queue.filter(
      (item) => item.status === "queued" || item.status === "error"
    );
    if (pending.length === 0) {
      toast.warn("Add at least one PDF to the queue first");
      return;
    }

    setUploading(true);

    // Process sequentially, in the order shown, so numbering stays meaningful
    // and we don't hammer the grammar-checking API with parallel requests.
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
    toast.success("Queue processed");
  };

  const doneCount = queue.filter((q) => q.status === "done").length;

  return (
    <div className="min-h-[calc(100vh-140px)] bg-paper paper-texture">
      <div className="max-w-2xl mx-auto pt-14 px-6 pb-20">
        <div className="text-center mb-10">
          <div className="font-ui text-[11px] tracking-[0.25em] uppercase text-redpen mb-3">
            New Submission
          </div>
          <h2 className="font-display text-4xl text-ink mb-3">
            Send your copy to the desk
          </h2>
          <p className="font-serif text-ink/70 max-w-lg mx-auto leading-relaxed">
            Upload one or more PDFs, put them in the order you want processed,
            choose which reader checks them, and send the whole batch to the
            desk in one go.
          </p>
        </div>

        {/* Engine selector */}
        <div className="bg-card rounded-sm shadow-sm p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <label className="block font-ui text-[11px] tracking-[0.1em] uppercase text-ink/50 mb-1.5">
              Proofreader
            </label>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              disabled={uploading}
              className="font-serif border-b-2 border-ink/20 focus:border-redpen bg-transparent px-1 py-1.5 text-sm outline-none disabled:opacity-50"
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
          </div>
          <p className="font-ui text-[11px] text-ink/40 max-w-xs">
            {ENGINE_INFO[engine]}
          </p>
        </div>

        <UploadDropzone onFilesSelected={addFiles} disabled={uploading} />

        {/* Queue */}
        {queue.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg text-ink">
                Assignment Queue
                <span className="font-ui text-[11px] text-ink/40 ml-2">
                  ({doneCount}/{queue.length} marked)
                </span>
              </h3>
              {!uploading && doneCount > 0 && (
                <button
                  onClick={clearFinished}
                  className="font-ui text-[11px] tracking-[0.1em] uppercase text-ink/40 hover:text-redpen"
                >
                  Clear finished
                </button>
              )}
            </div>

            <div className="divide-y divide-rule bg-card rounded-sm shadow-sm">
              {queue.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 p-4">
                  <span className="font-mono text-xs text-ink/30 w-6 shrink-0">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={uploading || index === 0}
                      className="font-ui text-ink/50 hover:text-redpen disabled:opacity-20 disabled:cursor-not-allowed leading-none text-sm px-1"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={uploading || index === queue.length - 1}
                      className="font-ui text-ink/50 hover:text-redpen disabled:opacity-20 disabled:cursor-not-allowed leading-none text-sm px-1"
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-ink truncate">
                      {item.file.name}
                    </p>
                    <p className="font-ui text-[10px] text-ink/40 mt-0.5">
                      {(item.file.size / 1024).toFixed(1)} KB
                      {item.status === "error" && item.error
                        ? ` · ${item.error}`
                        : ""}
                    </p>
                  </div>

                  <span
                    className={`font-ui text-[10px] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 border rounded-sm shrink-0 ${STATUS_CLASS[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>

                  {item.status === "done" && item.resultId ? (
                    <Link
                      to={`/document/${item.resultId}`}
                      className="font-ui text-[11px] tracking-[0.1em] uppercase font-semibold text-ink/60 hover:text-redpen shrink-0"
                    >
                      Open
                    </Link>
                  ) : (
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={uploading && item.status === "uploading"}
                      className="font-ui text-[11px] tracking-[0.1em] uppercase font-semibold text-ink/40 hover:text-redpen disabled:opacity-20 shrink-0"
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
          className="mt-6 w-full font-ui text-sm tracking-[0.15em] uppercase font-semibold bg-redpen hover:bg-[#8f2e24] disabled:bg-ink/20 disabled:cursor-not-allowed text-card py-4 rounded-sm transition-colors"
        >
          {uploading
            ? "Reading your copy…"
            : `Send ${queue.length > 1 ? `All ${queue.length} Files` : "to the stone"}`}
        </button>

        <div className="flex justify-center gap-8 mt-10 font-ui text-[11px] tracking-[0.1em] uppercase text-ink/40">
          <span>Spelling</span>
          <span className="text-rule">&bull;</span>
          <span>Grammar</span>
          <span className="text-rule">&bull;</span>
          <span>Punctuation</span>
        </div>
      </div>
    </div>
  );
}
