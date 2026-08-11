import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from './routes';

vi.mock('@geolonia/embed/core', () => ({
  GeoloniaMap: vi.fn(function () {
    return {
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
      addControl: vi.fn(),
      removeControl: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn(),
      hasImage: vi.fn(() => false),
      loadImage: vi.fn(() => Promise.resolve({ data: {} })),
      addImage: vi.fn(),
      fitBounds: vi.fn(),
      easeTo: vi.fn(),
      isStyleLoaded: vi.fn(() => true),
      remove: vi.fn(),
    };
  }),
  keyring: { setApiKey: vi.fn() },
}));
vi.mock('maplibre-gl', () => ({
  default: {
    GeolocateControl: vi.fn(function () {
      return { on: vi.fn(), off: vi.fn(), trigger: vi.fn() };
    }),
  },
  GeolocateControl: vi.fn(function () {
    return { on: vi.fn(), off: vi.fn(), trigger: vi.fn() };
  }),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('AppRoutes', () => {
  it('renders the top page (トップ / 検索・一覧) at /', () => {
    renderAt('/');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByTestId('page-heading')).toHaveTextContent('トップ / 検索・一覧');
  });

  it('renders the map view (地図閲覧) at /maps/:id', () => {
    renderAt('/maps/abc123');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByTestId('page-heading')).toHaveTextContent('地図閲覧');
  });

  it('renders the overlay view (重ね合わせ地図閲覧) at /overlays/:id', () => {
    renderAt('/overlays/xyz789');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByTestId('page-heading')).toHaveTextContent('重ね合わせ地図閲覧');
  });

  it('renders the map edit page (地図作成・編集) at /maps/:id/edit', () => {
    renderAt('/maps/abc123/edit');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByTestId('page-heading')).toHaveTextContent('地図作成・編集');
  });

  it('renders the embed settings page (embed設定) at /maps/:id/embed', () => {
    renderAt('/maps/abc123/embed');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByTestId('page-heading')).toHaveTextContent('embed設定');
  });

  it('renders my page (マイページ) at /mypage', () => {
    renderAt('/mypage');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByTestId('page-heading')).toHaveTextContent('マイページ');
  });

  it('renders the account settings page (アカウント設定) at /settings', () => {
    renderAt('/settings');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByTestId('page-heading')).toHaveTextContent('アカウント設定');
  });

  it('renders the admin page (管理者画面) at /admin', () => {
    renderAt('/admin');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByTestId('page-heading')).toHaveTextContent('管理者画面');
  });

  it('renders the embed view (embedビュー) at /embed/:type/:id without a header', () => {
    renderAt('/embed/overlay/xyz789');
    expect(screen.getByTestId('page-heading')).toHaveTextContent('embedビュー');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});
