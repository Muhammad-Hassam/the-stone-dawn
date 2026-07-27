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
      className={`relative border rounded-md p-10 text-center cursor-pointer transition-colors bg-card ${
        dragOver ? "border-ink" : "border-dashed border-rule hover:border-ink/50"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
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

      <div className="font-display text-lg text-ink mb-1">
        Drop one or more PDFs here
      </div>
      <p className="font-ui text-[13px] text-muted">
        or click to browse &middot; PDF only, up to 25MB each
      </p>
    </div>
  );
}
