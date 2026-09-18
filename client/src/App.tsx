import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { AuthModal } from '@/components/AuthModal';
import { RequireAdmin } from '@/components/ProtectedRoute';
import FeedPage from '@/pages/Feed';
import PostDetailPage from '@/pages/PostDetail';
import RoadmapPage from '@/pages/Roadmap';
import AdminPanelPage from '@/pages/AdminPanel';
import LoginPage from '@/pages/Login';
import SignupPage from '@/pages/Signup';
import ForgotPasswordPage from '@/pages/ForgotPassword';
import VerifyEmailPage from '@/pages/VerifyEmail';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPanelPage />
              </RequireAdmin>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>
      </Routes>
      <AuthModal />
    </>
  );
}
