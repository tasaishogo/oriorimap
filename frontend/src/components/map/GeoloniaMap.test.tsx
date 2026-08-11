import { render, screen } from '@testing-library/react';
import { GeoloniaMap, useGeoloniaMap } from './GeoloniaMap';

const { mapInstance, GeoloniaMapCtor } = vi.hoisted(() => {
  const mapInstance = {
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
  return { mapInstance, GeoloniaMapCtor: vi.fn(() => mapInstance) };
});

vi.mock('@geolonia/embed/core', () => ({
  GeoloniaMap: GeoloniaMapCtor,
  keyring: { setApiKey: vi.fn() },
}));

function MapConsumer() {
  const map = useGeoloniaMap();
  return <div data-testid="consumer">{map ? 'has-map' : 'no-map'}</div>;
}

describe('GeoloniaMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a container element with data-testid="geolonia-map-container"', () => {
    render(<GeoloniaMap />);
    expect(screen.getByTestId('geolonia-map-container')).toBeInTheDocument();
  });

  it('applies the className prop to the container element', () => {
    render(<GeoloniaMap className="h-full w-full" />);
    expect(screen.getByTestId('geolonia-map-container')).toHaveClass('h-full', 'w-full');
  });

  it('renders children inside the map container', () => {
    render(
      <GeoloniaMap>
        <div>child content</div>
      </GeoloniaMap>,
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('constructs the GeoloniaMap exactly once on mount, with the default center/zoom for a 0-spot map (R2.10)', () => {
    render(<GeoloniaMap />);
    const container = screen.getByTestId('geolonia-map-container');

    expect(GeoloniaMapCtor).toHaveBeenCalledTimes(1);
    expect(GeoloniaMapCtor).toHaveBeenCalledWith({
      container,
      apiKey: import.meta.env.VITE_GEOLONIA_API_KEY,
      center: [138.5, 37.0],
      zoom: 4.5,
    });
  });

  it('never passes attributionControl: false (帰属表記の受入条件・決定ログ#29-1)', () => {
    render(<GeoloniaMap />);
    expect(GeoloniaMapCtor).not.toHaveBeenCalledWith(
      expect.objectContaining({ attributionControl: false }),
    );
    expect(GeoloniaMapCtor).not.toHaveBeenCalledWith(
      expect.objectContaining({ attributionControl: expect.anything() }),
    );
  });

  it('uses custom initialCenter/initialZoom props instead of the defaults when provided', () => {
    render(<GeoloniaMap initialCenter={[135.0, 34.5]} initialZoom={10} />);
    expect(GeoloniaMapCtor).toHaveBeenCalledWith(
      expect.objectContaining({ center: [135.0, 34.5], zoom: 10 }),
    );
  });

  it('does not recreate the map instance when the component re-renders (e.g. children change)', () => {
    const { rerender } = render(
      <GeoloniaMap>
        <div>a</div>
      </GeoloniaMap>,
    );
    expect(GeoloniaMapCtor).toHaveBeenCalledTimes(1);

    rerender(
      <GeoloniaMap>
        <div>b</div>
      </GeoloniaMap>,
    );

    expect(GeoloniaMapCtor).toHaveBeenCalledTimes(1);
    expect(mapInstance.remove).not.toHaveBeenCalled();
  });

  it('calls map.remove() exactly once on unmount', () => {
    const { unmount } = render(<GeoloniaMap />);
    unmount();
    expect(mapInstance.remove).toHaveBeenCalledTimes(1);
  });

  it('provides the created map instance to descendants via useGeoloniaMap()', () => {
    render(
      <GeoloniaMap>
        <MapConsumer />
      </GeoloniaMap>,
    );
    expect(screen.getByTestId('consumer')).toHaveTextContent('has-map');
  });

  it('useGeoloniaMap() returns null when called without an ancestor GeoloniaMap', () => {
    render(<MapConsumer />);
    expect(screen.getByTestId('consumer')).toHaveTextContent('no-map');
  });
});

// Requirements: R2.10（0件時=日本全体 中心[138.5, 37.0] / zoom 4.5 の初期表示）
// 帰属表記受入条件（決定ログ#29-1・attributionControl: false を渡さないこと）
