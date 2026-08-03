import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import UploadDropzone from "../components/UploadDropzone";
import PdfThumbnail from "../components/PdfThumbnail";

let nextId = 1;

const SECTIONS = [
  "General",
  "National",
  "World",
  "Business",
  "Sports",
  "Opinion",
  "Local"
];

const ENGINE_INFO = {
  languagetool:
    "Sent to the LanguageTool API. Catches spelling, grammar & punctuation, but can misfire on unusual names or phrasing.",
  "ai-gemini":
    "Sent to Gemini for review. Requires GEMINI_API_KEY on the server.",
  "ai-chatgpt":
    "Sent to ChatGPT for review. Requires OPENAI_API_KEY on the server.",
  "offline-spellcheck":
    "Checked locally with an offline Hunspell dictionary — no API key, no network call. Spelling only."
};

function StepIndicator({ step }) {
  const steps = [
    "Upload the night's pages",
    "Confirm each page's number",
    "Get the report & printable fix-list"
  ];
  return (
    <div className="bg-paper border border-rule rounded-md px-4 py-3 mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-[13px] text-ink/80">
      {steps.map((label, i) => (
        <span key={label} className="flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold shrink-0 ${
              i + 1 <= step
                ? "bg-ink text-card"
                : "bg-card border border-rule text-muted"
            }`}
          >
            {i + 1}
          </span>
          {label}
          {i < steps.length - 1 && <span className="text-muted mx-1">→</span>}
        </span>
      ))}
    </div>
  );
}

export default function NewProofPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState([]);
  const [section, setSection] = useState("National");
  const [engine, setEngine] = useState("languagetool");
  const [liveFactCheck, setLiveFactCheck] = useState(false);
  const [aiExtrasProvider, setAiExtrasProvider] = useState("gemini");
  const [enableHallucinationCheck, setEnableHallucinationCheck] =
    useState(false);
  const [enableSensitiveCheck, setEnableSensitiveCheck] = useState(false);
  const [enableSummary, setEnableSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  const addFiles = (newFiles) => {
    setFiles((prev) => {
      const startAt = prev.length;
      const added = newFiles.map((file, i) => ({
        id: nextId++,
        file,
        pageNumber: startAt + i + 1
      }));
      return [...prev, ...added];
    });
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const setPageNumber = (id, value) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, pageNumber: value } : f))
    );
  };

  const handleDrop = (targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setFiles((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((f, i) => ({ ...f, pageNumber: i + 1 }));
    });
    setDragIndex(null);
  };

  const goToConfirmStep = () => {
    if (files.length === 0) {
      toast.warn("Choose at least one PDF first");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("pdfs", f.file));
      formData.append(
        "pageNumbers",
        JSON.stringify(files.map((f) => Number(f.pageNumber) || 0))
      );
      formData.append("section", section);
      formData.append("engine", engine);
      formData.append("liveFactCheck", liveFactCheck ? "true" : "false");
      formData.append(
        "enableHallucinationCheck",
        enableHallucinationCheck ? "true" : "false"
      );
      formData.append(
        "enableSensitiveCheck",
        enableSensitiveCheck ? "true" : "false"
      );
      formData.append("enableSummary", enableSummary ? "true" : "false");
      formData.append("aiExtrasProvider", aiExtrasProvider);

      const { data } = await axiosClient.post("/editions/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success("Edition processed");
      navigate(`/edition/${data.data._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="font-display text-4xl text-ink">New proof</h2>

            <p className="font-ui text-sm text-muted mt-2">
              Upload pages and configure automated editorial checks.
            </p>
          </div>
          <div className="bg-card border border-rule rounded-xl px-5 py-3 text-center ">
            <span className="font-ui text-xs text-muted">Step</span>
            <div className="font-display text-2xl text-ink">{step}/2</div>
          </div>
        </div>
        <StepIndicator step={step} />
        <div className="mt-8 bg-card border border-rule ounded-2xl p-6 md:p-8">
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <label className="block font-ui text-sm text-ink mb-2">
                  Section
                  <span className="text-muted ml-2">(report label only)</span>
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-xl px-4 py-3 font-serif text-ink outline-none focus:border-ink"
                >
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-ui text-sm text-ink mb-2">
                  Page PDFs
                </label>
                <div className="border border-rule rounded-xl p-5 bg-paper">
                  <UploadDropzone
                    onFilesSelected={addFiles}
                    disabled={submitting}
                  />
                  <p className="font-ui text-xs text-muted mt-3">
                    Combined edition PDF or individual pages.
                    {files.length > 0 && (
                      <span className="text-ink font-medium ml-1">
                        {files.length} file(s) selected
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div>
                <label className="block font-ui text-sm text-ink mb-2">
                  Proofreader
                </label>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  className="w-full bg-paper border border-rule rounded-xl px-4 py-3 font-serif text-ink"
                ></select>
                <p className="font-ui text-xs text-muted mt-2 ">
                  {ENGINE_INFO[engine]}
                </p>
              </div>
              <div className="border border-rule rounded-2xl p-5 bg-paper">
                <h3 className="font-display text-xl text-ink">AI Extras</h3>
                <p className="font-ui text-xs text-muted mt-1 mb-5">
                  Additional AI powered editorial checks.
                </p>
                <select
                  value={aiExtrasProvider}
                  onChange={(e) => setAiExtrasProvider(e.target.value)}
                  className="w-full bg-card border border-rule rounded-xl px-4 py-3 text-ink mb-5"
                >
                  <option value="gemini">Gemini</option>
                  <option value="chatgpt">ChatGPT</option>
                </select>
                <div className="space-y-4">
                  {[
                    [
                      enableHallucinationCheck,
                      setEnableHallucinationCheck,
                      "Detect hallucinations",
                      "Flags fake quotes, stats and contradictions"
                    ],
                    [
                      enableSensitiveCheck,
                      setEnableSensitiveCheck,
                      "Sensitive content",
                      "Detects PII and editorial risks"
                    ],
                    [
                      enableSummary,
                      setEnableSummary,
                      "Article summary",
                      "Creates summary and key points"
                    ]
                  ].map(([checked, setter, title, desc]) => (
                    <label
                      key={title}
                      className="flex gap-3 items-start cursor-pointer "
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setter(e.target.checked)}
                        className="mt-1 w-4 h-4"
                      />
                      <div>
                        <p className="font-ui text-sm text-ink">{title}</p>
                        <p className="font-ui text-xs text-muted">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 font-ui text-sm text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={liveFactCheck}
                  onChange={(e) => setLiveFactCheck(e.target.checked)}
                  className="w-4 h-4"
                />
                Live fact-check
              </label>

              {liveFactCheck && (
                <div className=" bg-brass/10 border border-brass rounded-xl p-5 font-ui text-sm text-ink ">
                  Fact-check sends doubtful claims for verification.
                  <strong className="block mt-2">
                    Don't enable for unpublished exclusives.
                  </strong>
                  <p className="text-xs text-muted mt-2">
                    Search verification pipeline is currently a placeholder.
                  </p>
                </div>
              )}

              <button
                onClick={goToConfirmStep}
                disabled={files.length === 0}
                className=" w-full bg-ink text-card rounded-xl py-3.5 font-ui text-sm font-medium hover:opacity-85 disabled:opacity-40 transition "
              >
                Continue — read page numbers →
              </button>
            </div>
          )}
          {step === 2 && (
            <div>
              <p className=" font-ui text-sm text-muted mb-6">
                Drag pages to reorder or edit page numbers.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {files.map((f, index) => (
                  <div
                    key={f.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className={`bg-paper border border-rule rounded-xl p-3 cursor-move ${dragIndex === index ? "opacity-40" : ""}`}
                  >
                    <div className="flex justify-between mb-3 ">
                      <span className="font-ui text-xs text-muted ">
                        Page {f.pageNumber}
                      </span>

                      <button
                        onClick={() => removeFile(f.id)}
                        className="text-muted hover:text-redpen "
                      >
                        ✕
                      </button>
                    </div>
                    <PdfThumbnail file={f.file} width={180} />
                    <p className="text-xs text-muted truncate mt-2">
                      {f.file.name}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 rounded-xl border border-rule text-ink font-ui"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || files.length === 0}
                  className="flex-1 bg-ink text-card rounded-xl font-ui disabled:opacity-40 "
                >
                  {submitting ? "Reading pages…" : "Confirm & save"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
