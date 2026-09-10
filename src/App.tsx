import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SelectCompanyPage from "./pages/SelectCompanyPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import CompleteAccountPage from "./pages/CompleteAccountPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import BookkeeperPage from "./pages/BookkeeperPage";
import ProfilePage from "./pages/ProfilePage";
import PullToRefresh from "./components/PullToRefresh";
import SplashScreen from "./components/SplashScreen";
import ButtonRipple from "./components/ButtonRipple";
import OfflineBanner from "./components/OfflineBanner";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <SplashScreen />
      <ButtonRipple />
      <OfflineBanner />
      <AuthProvider>
        <PullToRefresh>
          <Routes>
            <Route path="/select-company" element={<SelectCompanyPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/complete-account"
              element={
                <ProtectedRoute>
                  <CompleteAccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireRole="manager">
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookkeeper"
              element={
                <ProtectedRoute requireRole="bookkeeper">
                  <BookkeeperPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </PullToRefresh>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
