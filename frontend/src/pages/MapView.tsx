import { GeoloniaMap } from '@/components/map/GeoloniaMap';
import { SymbolLayers, type SpotIcon, type SpotMarker } from '@/components/map/SymbolLayers';
import { GeolocateButton } from '@/components/map/GeolocateButton';
import { LegendCard } from '@/components/map/LegendCard';

// TODO: 実データ取得は後続タスクで実装する。ここでは3点のサンプルGeoJSONで動作を示す
// アイコンはPNG（MapLibreのcreateImageBitmapベースのloadImageはSVGデコードに非対応なため）
const SAMPLE_ICONS: SpotIcon[] = [
  {
    id: 'pin',
    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADfUlEQVR4AdRVS0hUURj+z1UnNaKoFgZSkQsJ0QTbtIsQHWeMSlMXhc6kM0IgtCh640Zc9qA23pFmRCpD6eUrVCKqXViYEbqoRYWGJlhZhOI9/f+dh8M95815KESX+9/zn+///u9859x5KPCPr//LQH1p+2ZXuepxOdU+d7lvAuNHKCZ0zNHe4C1u25jIocZ1AsfKfNm4sLqcxqcZMJUx5sRFcjE2hCJXxxTuW0xXZtxOXxv1YC3mHdOA2+E7ZEvhk7iwhwHYYinqHAZe6nE5fRWx+JYG3OXqec7gAQDLhIQvvafH5VTPWrWaGqhzqJXY2MIYMByTuqkXo9XlbK8yE5AaqLX7CpgCnQD4hNVeqMG0DpdDLZQpSQ2kpMIFBixD1pAMRlpMYedkvYKBurK2HCTWYJje+UXZ0HztMNzsqtWDcsJMG4KFmpB2cBZ6CgYYU0zfF+4CKmv3wqlmO+zI2QqZ6216UE7YkeNF+NJYSFocmKIcNKKCAVCg2EgKz3PzssBZVQhMsgZh5Vjbnb8tTBdGbLMbQcEAkrKNpPDccXRPOJWOdEL2igJpTQcZ7ATDJRgAzrMMnMh0+64tkdwsseRItEUDAOlm4muAC9oSA2zWbKFPH+fMShHcmiNqSwzAaETNkDy5/xa4xg3oypRqAz1jK4CYCdqCAQ2gV+wLIu/HpmAQTQRn4vPxvTcwMT4tFkKITFs0sLSuC/k/MaR3T8cruHSyB54PTcLczIIelBP26M5raQ+BeG7z6xTtLuXRIRjoHKr9heQr0SRjPvV5HgI3XsCZ+i49KCfMyDPMr6u9jb8NGP7sGBGc2/5oVwH4N0zX5MYNzQU1RTnhBIiijjR+B66cpnwtgmnQpGtKxKQGiOfvb+jgnLdRvpogDf+AR3j3YU1TA0SwfeVNnMMw5UkF5yOkYdVraUAdbVyCtNRq3MW4lYi0xuEdT0ur0jWkhCBoaYAogYfu+SWNOdDEB5rHE8Rd1KCMemPxYxoggduDni9MS92H34yXNLcK/MQ/Iy71WPHCtbgMENk/eGJ2IWPTfjRxGRdZJiw6CMPPy8VAX8MB4kbXrPK4DZBId3f1sr/P26JwbgcOK39amLNlKAn0e1oBGHqBuK+EDIRVb/V7R0BLyePAh3DXw5T7Bz1Pw/VExqQM0AJ0zIE+bynuuoRywpKJpA3Eu1gs3l8AAAD//3JIdAUAAAAGSURBVAMATzAnUODQJQQAAAAASUVORK5CYII=',
  },
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
