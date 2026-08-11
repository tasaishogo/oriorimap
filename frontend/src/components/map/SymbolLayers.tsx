import { useEffect } from 'react';
import type { Map as MaplibreMap, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import { useGeoloniaMap } from './GeoloniaMap';

export type SpotIcon = { id: string; url: string };
export type SpotMarker = { id: string; lng: number; lat: number; iconId: string; name?: string };

export type SymbolLayersProps = {
  spots: SpotMarker[];
  icons: SpotIcon[];
  sourceId?: string;
  layerId?: string;
};

export function fitToSpots(map: MaplibreMap, spots: SpotMarker[]): void {
  if (spots.length === 0) {
    return;
  }
  if (spots.length === 1) {
    const [spot] = spots;
    map.easeTo({ center: [spot.lng, spot.lat], zoom: 14, duration: 0 });
    return;
  }
  const lngs = spots.map((spot) => spot.lng);
  const lats = spots.map((spot) => spot.lat);
  map.fitBounds(
    [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ],
    { padding: 48, maxZoom: 16, duration: 0 },
  );
}

function toFeatureCollection(spots: SpotMarker[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: spots.map((spot) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [spot.lng, spot.lat] },
      properties: { iconId: spot.iconId, name: spot.name },
    })),
  };
}

export function SymbolLayers({
  spots,
  icons,
  sourceId = 'spots',
  layerId = 'spots-symbol',
}: SymbolLayersProps) {
  const map = useGeoloniaMap();

  useEffect(() => {
    if (!map) {
      return;
    }
    let cancelled = false;

    const sync = async () => {
      for (const icon of icons) {
        if (cancelled) {
          return;
        }
        if (!map.hasImage(icon.id)) {
          const { data } = await map.loadImage(icon.url);
          if (cancelled) {
            return;
          }
          map.addImage(icon.id, data);
        }
      }
      if (cancelled) {
        return;
      }

      const data = toFeatureCollection(spots);
      const existingSource = map.getSource(sourceId);
      if (!existingSource) {
        map.addSource(sourceId, { type: 'geojson', data });
        map.addLayer({
          id: layerId,
          type: 'symbol',
          source: sourceId,
          layout: {
            'icon-image': ['get', 'iconId'],
            'icon-size': 1,
            'icon-allow-overlap': true,
          },
        });
      } else {
        (existingSource as GeoJSONSource).setData(data);
      }

      fitToSpots(map, spots);
    };

    if (map.isStyleLoaded()) {
      void sync();
    } else {
      void map.once('load', () => {
        if (!cancelled) {
          void sync();
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [map, spots, icons, sourceId, layerId]);

  return null;
}
