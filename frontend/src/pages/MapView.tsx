import { GeoloniaMap } from '@/components/map/GeoloniaMap';
import { SymbolLayers, type SpotIcon, type SpotMarker } from '@/components/map/SymbolLayers';
import { GeolocateButton } from '@/components/map/GeolocateButton';
import { LegendCard } from '@/components/map/LegendCard';

// TODO: 実データ取得は後続タスクで実装する。ここでは3点のサンプルGeoJSONで動作を示す
const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
  '<path fill="#614C9B" d="M16 2c-6.6 0-12 5.4-12 12 0 9 12 16 12 16s12-7 12-16c0-6.6-5.4-12-12-12z"/>' +
  '<circle cx="16" cy="14" r="5" fill="#FFFFFF"/></svg>';

const SAMPLE_ICONS: SpotIcon[] = [
  { id: 'pin', url: `data:image/svg+xml,${encodeURIComponent(PIN_SVG)}` },
];

const SAMPLE_SPOTS: SpotMarker[] = [
  { id: 'tokyo-station', lng: 139.767125, lat: 35.681236, iconId: 'pin', name: '東京駅' },
  { id: 'sensoji', lng: 139.796713, lat: 35.714765, iconId: 'pin', name: '浅草寺' },
  { id: 'minatomirai', lng: 139.6317, lat: 35.4548, iconId: 'pin', name: 'みなとみらい' },
];

export default function MapView() {
  return (
    <section className="space-y-2">
      <h1 data-testid="page-heading" className="font-display text-2xl font-bold text-primary-dark">
        地図閲覧
      </h1>
      <p className="text-muted-foreground">
        地図とスポットの凡例を表示し、他の地図をかさねて閲覧できます。
      </p>
      <div className="relative h-[70vh] overflow-hidden rounded-xl border [&_.maplibregl-ctrl-geolocate]:hidden">
        <GeoloniaMap className="absolute inset-0">
          <SymbolLayers spots={SAMPLE_SPOTS} icons={SAMPLE_ICONS} />
          <GeolocateButton className="absolute top-4 right-4" />
          <LegendCard className="absolute bottom-4 left-4" />
        </GeoloniaMap>
      </div>
    </section>
  );
}
