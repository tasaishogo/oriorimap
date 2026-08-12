import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import Admin from './pages/Admin';
import Confirm from './pages/Confirm';
import EmbedSettings from './pages/EmbedSettings';
import EmbedView from './pages/EmbedView';
import Login from './pages/Login';
import MapEdit from './pages/MapEdit';
import MapView from './pages/MapView';
import MyPage from './pages/MyPage';
import OverlayView from './pages/OverlayView';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import Signup from './pages/Signup';
import Top from './pages/Top';

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppLayout>
            <Top />
          </AppLayout>
        }
      />
      <Route
        path="/maps/:id"
        element={
          <AppLayout>
            <MapView />
          </AppLayout>
        }
      />
      <Route
        path="/overlays/:id"
        element={
          <AppLayout>
            <OverlayView />
          </AppLayout>
        }
      />
      <Route
        path="/maps/:id/edit"
        element={
          <AppLayout>
            <MapEdit />
          </AppLayout>
        }
      />
      <Route
        path="/maps/:id/embed"
        element={
          <AppLayout>
            <EmbedSettings />
          </AppLayout>
        }
      />
      <Route path="/embed/:type/:id" element={<EmbedView />} />
      <Route
        path="/login"
        element={
          <AppLayout>
            <Login />
          </AppLayout>
        }
      />
      <Route
        path="/signup"
        element={
          <AppLayout>
            <Signup />
          </AppLayout>
        }
      />
      <Route
        path="/confirm"
        element={
          <AppLayout>
            <Confirm />
          </AppLayout>
        }
      />
      <Route
        path="/reset-password"
        element={
          <AppLayout>
            <ResetPassword />
          </AppLayout>
        }
      />
      <Route
        path="/mypage"
        element={
          <AppLayout>
            <ProtectedRoute>
              <MyPage />
            </ProtectedRoute>
          </AppLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <AppLayout>
            <Settings />
          </AppLayout>
        }
      />
      <Route
        path="/admin"
        element={
          <AppLayout>
            <Admin />
          </AppLayout>
        }
      />
    </Routes>
  );
}
