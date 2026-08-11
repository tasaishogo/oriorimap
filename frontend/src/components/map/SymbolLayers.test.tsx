import { render, waitFor } from '@testing-library/react';
import { GeoloniaMap } from './GeoloniaMap';
import { SymbolLayers, fitToSpots, type SpotIcon, type SpotMarker } from './SymbolLayers';

const { mapInstance, GeoloniaMapCtor, sourceState, fakeSource } = vi.hoisted(() => {
  const fakeSource = { setData: vi.fn() };
  const sourceState: { current: typeof fakeSource | null } = { current: null };

  const mapInstance = {
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    addControl: vi.fn(),
    removeControl: vi.fn(),
    addSource: vi.fn(() => {
      sourceState.current = fakeSource;
    }),
    addLayer: vi.fn(),
    getSource: vi.fn(() => sourceState.current),
    hasImage: vi.fn((_id: string) => false),
    loadImage: vi.fn((url: string) => Promise.resolve({ data: `image-data:${url}` })),
    addImage: vi.fn(),
    fitBounds: vi.fn(),
    easeTo: vi.fn(),
    isStyleLoaded: vi.fn(() => true),
    remove: vi.fn(),
  };
  return { mapInstance, GeoloniaMapCtor: vi.fn(() => mapInstance), sourceState, fakeSource };
});

vi.mock('@geolonia/embed/core', () => ({
  GeoloniaMap: GeoloniaMapCtor,
  keyring: { setApiKey: vi.fn() },
}));

describe('SymbolLayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sourceState.current = null;
    mapInstance.hasImage.mockImplementation(() => false);
  });

  it('creates an empty FeatureCollection source/layer and skips fitBounds/easeTo for 0 spots (R2.10)', async () => {
    render(
      <GeoloniaMap>
        <SymbolLayers spots={[]} icons={[]} />
      </GeoloniaMap>,
    );

    await waitFor(() => expect(mapInstance.addSource).toHaveBeenCalledTimes(1));

    expect(mapInstance.addSource).toHaveBeenCalledWith('spots', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    expect(mapInstance.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'spots-symbol',
        type: 'symbol',
        source: 'spots',
        layout: expect.objectContaining({ 'icon-image': ['get', 'iconId'] }),
      }),
    );
    expect(mapInstance.fitBounds).not.toHaveBeenCalled();
    expect(mapInstance.easeTo).not.toHaveBeenCalled();
  });

  it('uses custom sourceId/layerId when provided', async () => {
    render(
      <GeoloniaMap>
        <SymbolLayers spots={[]} icons={[]} sourceId="custom-source" layerId="custom-layer" />
      </GeoloniaMap>,
    );

    await waitFor(() =>
      expect(mapInstance.addSource).toHaveBeenCalledWith('custom-source', expect.anything()),
    );
    expect(mapInstance.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'custom-layer', source: 'custom-source' }),
    );
  });

  it('registers unregistered icons via loadImage/addImage and skips already-registered icons', async () => {
    mapInstance.hasImage.mockImplementation((id: string) => id === 'existing');
    const icons: SpotIcon[] = [
      { id: 'existing', url: 'existing.png' },
      { id: 'new-icon', url: 'new.png' },
    ];

    render(
      <GeoloniaMap>
        <SymbolLayers spots={[]} icons={icons} />
      </GeoloniaMap>,
    );

    await waitFor(() => expect(mapInstance.addImage).toHaveBeenCalledTimes(1));

    expect(mapInstance.loadImage).toHaveBeenCalledTimes(1);
    expect(mapInstance.loadImage).toHaveBeenCalledWith('new.png');
    expect(mapInstance.addImage).toHaveBeenCalledWith('new-icon', 'image-data:new.png');
  });

  it('builds a GeoJSON Point feature per spot and easeTo-fits a single spot at zoom 14 (R2.10 fitBounds相当)', async () => {
    const spots: SpotMarker[] = [
      { id: 's1', lng: 139.767, lat: 35.681, iconId: 'a', name: '東京駅' },
    ];

    render(
      <GeoloniaMap>
        <SymbolLayers spots={spots} icons={[]} />
      </GeoloniaMap>,
    );

    await waitFor(() => expect(mapInstance.addSource).toHaveBeenCalledTimes(1));

    expect(mapInstance.addSource).toHaveBeenCalledWith('spots', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [139.767, 35.681] },
            properties: { iconId: 'a', name: '東京駅' },
          },
        ],
      },
    });

    await waitFor(() =>
      expect(mapInstance.easeTo).toHaveBeenCalledWith({
        center: [139.767, 35.681],
        zoom: 14,
        duration: 0,
      }),
    );
    expect(mapInstance.fitBounds).not.toHaveBeenCalled();
  });

  it('fitBounds()s to the exact computed bbox for 2+ spots', async () => {
    const spots: SpotMarker[] = [
      { id: 's1', lng: 139.0, lat: 35.0, iconId: 'a' },
      { id: 's2', lng: 141.0, lat: 36.5, iconId: 'b' },
      { id: 's3', lng: 140.0, lat: 34.0, iconId: 'c' },
    ];

    render(
      <GeoloniaMap>
        <SymbolLayers spots={spots} icons={[]} />
      </GeoloniaMap>,
    );

    await waitFor(() =>
      expect(mapInstance.fitBounds).toHaveBeenCalledWith(
        [
          [139.0, 34.0],
          [141.0, 36.5],
        ],
        { padding: 48, maxZoom: 16, duration: 0 },
      ),
    );
    expect(mapInstance.easeTo).not.toHaveBeenCalled();
  });

  it('updates via source.setData() instead of recreating the source/layer when spots change', async () => {
    const initialSpots: SpotMarker[] = [{ id: 's1', lng: 139.0, lat: 35.0, iconId: 'a' }];
    const { rerender } = render(
      <GeoloniaMap>
        <SymbolLayers spots={initialSpots} icons={[]} />
      </GeoloniaMap>,
    );

    await waitFor(() => expect(mapInstance.addSource).toHaveBeenCalledTimes(1));
    expect(mapInstance.addLayer).toHaveBeenCalledTimes(1);

    const updatedSpots: SpotMarker[] = [
      ...initialSpots,
      { id: 's2', lng: 141.0, lat: 36.0, iconId: 'b' },
    ];
    rerender(
      <GeoloniaMap>
        <SymbolLayers spots={updatedSpots} icons={[]} />
      </GeoloniaMap>,
    );

    await waitFor(() => expect(fakeSource.setData).toHaveBeenCalledTimes(1));

    expect(mapInstance.addSource).toHaveBeenCalledTimes(1);
    expect(mapInstance.addLayer).toHaveBeenCalledTimes(1);
    expect(fakeSource.setData).toHaveBeenCalledWith({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [139.0, 35.0] },
          properties: { iconId: 'a', name: undefined },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [141.0, 36.0] },
          properties: { iconId: 'b', name: undefined },
        },
      ],
    });
  });
});

describe('fitToSpots (pure function, R2.10 spot-count branches)', () => {
  const map = mapInstance as unknown as Parameters<typeof fitToSpots>[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing for 0 spots', () => {
    fitToSpots(map, []);
    expect(mapInstance.easeTo).not.toHaveBeenCalled();
    expect(mapInstance.fitBounds).not.toHaveBeenCalled();
  });

  it('eases to the single spot at zoom 14, duration 0 for exactly 1 spot', () => {
    fitToSpots(map, [{ id: 's1', lng: 139.767, lat: 35.681, iconId: 'a' }]);
    expect(mapInstance.easeTo).toHaveBeenCalledWith({
      center: [139.767, 35.681],
      zoom: 14,
      duration: 0,
    });
    expect(mapInstance.fitBounds).not.toHaveBeenCalled();
  });

  it('fitBounds()s to the exact computed bbox with padding 48 / maxZoom 16 for 2+ spots', () => {
    fitToSpots(map, [
      { id: 's1', lng: 139.0, lat: 35.0, iconId: 'a' },
      { id: 's2', lng: 141.0, lat: 36.5, iconId: 'b' },
      { id: 's3', lng: 140.0, lat: 34.0, iconId: 'c' },
    ]);
    expect(mapInstance.fitBounds).toHaveBeenCalledWith(
      [
        [139.0, 34.0],
        [141.0, 36.5],
      ],
      { padding: 48, maxZoom: 16, duration: 0 },
    );
    expect(mapInstance.easeTo).not.toHaveBeenCalled();
  });
});

// Requirements: R2.10（0件=日本全体維持・全スポットfitBounds・単一スポットeaseTo）
