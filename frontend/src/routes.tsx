import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import Admin from './pages/Admin';
import EmbedSettings from './pages/EmbedSettings';
import EmbedView from './pages/EmbedView';
import MapEdit from './pages/MapEdit';
import MapView from './pages/MapView';
import MyPage from './pages/MyPage';
import OverlayView from './pages/OverlayView';
import Settings from './pages/Settings';
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
        path="/mypage"
        element={
          <AppLayout>
            <MyPage />
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
