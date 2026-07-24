import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import UploadPage from "./pages/UploadPage";
import HistoryPage from "./pages/HistoryPage";
import ResultPage from "./pages/ResultPage";
import AdminOverviewPage from "./pages/AdminOverviewPage";
import AdminStaffPage from "./pages/AdminStaffPage";
import AdminFilesPage from "./pages/AdminFilesPage";

export default function App() {
  return (
    <div className="min-h-screen bg-paper font-serif">
      <ToastContainer position="top-right" autoClose={3000} toastClassName="font-ui text-sm" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<UploadPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/document/:id" element={<ResultPage />} />
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
