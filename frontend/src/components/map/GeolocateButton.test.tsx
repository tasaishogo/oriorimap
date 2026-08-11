import { render, screen, fireEvent } from '@testing-library/react';
import { GeoloniaMap } from './GeoloniaMap';
import { GeolocateButton } from './GeolocateButton';

const { mapInstance, GeoloniaMapCtor, controlInstance, GeolocateControlCtor } = vi.hoisted(() => {
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
  const controlInstance = {
    on: vi.fn<(event: string, handler: (...args: unknown[]) => void) => void>(),
    off: vi.fn(),
    trigger: vi.fn(),
  };
  return {
    mapInstance,
    GeoloniaMapCtor: vi.fn(function () {
      return mapInstance;
    }),
    controlInstance,
    GeolocateControlCtor: vi.fn(function () {
      return controlInstance;
    }),
  };
});

vi.mock('@geolonia/embed/core', () => ({
  GeoloniaMap: GeoloniaMapCtor,
  keyring: { setApiKey: vi.fn() },
}));

vi.mock('maplibre-gl', () => ({
  default: { GeolocateControl: GeolocateControlCtor },
  GeolocateControl: GeolocateControlCtor,
}));

function renderWithMap() {
  return render(
    <GeoloniaMap>
      <GeolocateButton />
    </GeoloniaMap>,
  );
}

describe('GeolocateButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a button with data-testid="geolocate-button" and aria-label="現在地を表示"', () => {
    renderWithMap();
    const button = screen.getByTestId('geolocate-button');
    expect(button).toHaveAttribute('aria-label', '現在地を表示');
  });

  it('creates a single GeolocateControl and adds it to the top-right on mount', () => {
    renderWithMap();
    expect(GeolocateControlCtor).toHaveBeenCalledTimes(1);
    expect(mapInstance.addControl).toHaveBeenCalledTimes(1);
    expect(mapInstance.addControl).toHaveBeenCalledWith(controlInstance, 'top-right');
  });

  it('removes the control from the map on unmount', () => {
    const { unmount } = renderWithMap();
    unmount();
    expect(mapInstance.removeControl).toHaveBeenCalledWith(controlInstance);
  });

  it('triggers geolocation via control.trigger() on click', () => {
    renderWithMap();
    fireEvent.click(screen.getByTestId('geolocate-button'));
    expect(controlInstance.trigger).toHaveBeenCalledTimes(1);
  });

  it('subscribes to the control error event without throwing or blocking the UI (R4.8)', () => {
    renderWithMap();

    const errorRegistration = controlInstance.on.mock.calls.find(([event]) => event === 'error');
    expect(errorRegistration).toBeDefined();
    const handler = errorRegistration![1];

    expect(() => handler({ code: 1, message: 'User denied Geolocation' })).not.toThrow();
    expect(screen.getByTestId('geolocate-button')).toBeInTheDocument();
  });

  it('renders without crashing and does nothing on click when there is no ancestor GeoloniaMap (R4.8)', () => {
    render(<GeolocateButton />);

    const button = screen.getByTestId('geolocate-button');
    expect(button).toBeInTheDocument();
    expect(GeolocateControlCtor).not.toHaveBeenCalled();
    expect(mapInstance.addControl).not.toHaveBeenCalled();

    expect(() => fireEvent.click(button)).not.toThrow();
    expect(controlInstance.trigger).not.toHaveBeenCalled();
  });
});

// Requirements: R4.7（現在地表示許可時）, R4.8（拒否・取得失敗時は通常表示を継続。地図未生成時も含む）
