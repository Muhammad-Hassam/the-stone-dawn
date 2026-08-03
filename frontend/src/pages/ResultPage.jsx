import { useParams } from "react-router-dom";
import DocumentReport from "../components/DocumentReport";

// Direct single-file view — e.g. clicked from Admin's "All Copy" list.
// Editions use DocumentReport too, but wrapped with page navigation
// instead of this standalone page (see EditionReportPage).
export default function ResultPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-24">
        <DocumentReport documentId={id} backTo="/history" backLabel="← History" />
      </div>
    </div>
  );
}
