import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import NewProofPage from "./pages/NewProofPage";
import HistoryPage from "./pages/HistoryPage";
import ResultPage from "./pages/ResultPage";
import EditionReportPage from "./pages/EditionReportPage";
import PrintFixListPage from "./pages/PrintFixListPage";
import AdminOverviewPage from "./pages/AdminOverviewPage";
import AdminStaffPage from "./pages/AdminStaffPage";
import AdminFilesPage from "./pages/AdminFilesPage";

export default function App() {
  return (
    <div className="min-h-screen bg-paper font-serif">
      <ToastContainer position="top-right" autoClose={3000} toastClassName="font-ui text-sm" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Print view has no site chrome, so it's not nested under Navbar */}
        <Route
          path="/edition/:id/print"
          element={
            <ProtectedRoute>
              <PrintFixListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<NewProofPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/document/:id" element={<ResultPage />} />
                  <Route path="/edition/:id" element={<EditionReportPage />} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute adminOnly>
                        <AdminOverviewPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/staff"
                    element={
                      <ProtectedRoute adminOnly>
                        <AdminStaffPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/files"
                    element={
                      <ProtectedRoute adminOnly>
                        <AdminFilesPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
