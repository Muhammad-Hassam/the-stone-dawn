import { useRef, useState } from "react";

export default function UploadDropzone({ onFileSelected, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFile = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please select a PDF file");
      return;
    }
    setFileName(file.name);
    onFileSelected(file);
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
        handleFile(e.dataTransfer.files?.[0]);
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
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="font-ui text-[10px] tracking-[0.25em] uppercase text-ink/40 mb-3">
        Intake Tray
      </div>

      <div className="font-display text-2xl text-ink mb-2">
        {fileName ? fileName : "Drop your manuscript here"}
      </div>
      <p className="font-ui text-sm text-ink/50">
        or click to browse &middot; PDF only, up to 25MB
      </p>
    </div>
  );
}
