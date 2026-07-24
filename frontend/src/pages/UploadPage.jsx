import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axiosClient from "../api/axiosClient";
import UploadDropzone from "../components/UploadDropzone";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) {
      toast.warn("Please select a PDF first");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    setUploading(true);
    try {
      const { data } = await axiosClient.post("/pdf/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.data.status === "failed") {
        toast.error(data.data.errorMessage || "Processing failed");
      } else {
        toast.success("Copy has been marked up!");
      }
      navigate(`/document/${data.data._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

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
            Upload a PDF and the desk will read every line, circle every slip in
            spelling and grammar, and return a clean copy ready for print —
            filed permanently in the back issues.
          </p>
        </div>

        <UploadDropzone onFileSelected={setFile} disabled={uploading} />

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-6 w-full font-ui text-sm tracking-[0.15em] uppercase font-semibold bg-redpen hover:bg-[#8f2e24] disabled:bg-ink/20 disabled:cursor-not-allowed text-card py-4 rounded-sm transition-colors"
        >
          {uploading ? "Reading your copy…" : "Send to the stone"}
        </button>

        <div className="flex justify-center gap-8 mt-10 font-ui text-[11px] tracking-[0.1em] uppercase text-ink/40">
          <span>Spelling</span>
          <span className="text-rule">&bull;</span>
          <span>Grammar</span>
          <span className="text-rule">&bull;</span>
          <span>Clean Copy Out</span>
        </div>
      </div>
    </div>
  );
}
