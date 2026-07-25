import { useRef, useState } from "react";

export default function UploadDropzone({ onFilesSelected, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    const pdfs = files.filter((f) => f.type === "application/pdf");
    const rejected = files.length - pdfs.length;
    if (rejected > 0) {
      alert(`${rejected} file(s) skipped — only PDFs are accepted`);
    }
    if (pdfs.length > 0) onFilesSelected(pdfs);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative border-[3px] rounded-sm p-12 text-center cursor-pointer transition-colors bg-card ${
        dragOver ? "border-redpen" : "border-dashed border-ink/25 hover:border-ink/50"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(32,29,26,0.02) 10px, rgba(32,29,26,0.02) 11px)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = ""; // allow re-selecting the same file(s) again later
        }}
      />

      <div className="font-ui text-[10px] tracking-[0.25em] uppercase text-ink/40 mb-3">
        Intake Tray
      </div>

      <div className="font-display text-2xl text-ink mb-2">
        Drop one or more manuscripts here
      </div>
      <p className="font-ui text-sm text-ink/50">
        or click to browse &middot; PDF only, up to 25MB each
      </p>
    </div>
  );
}
