import { useEffect, useRef, useState } from 'react';
import { GeolocateControl } from 'maplibre-gl';
import { LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeoloniaMap } from './GeoloniaMap';

export type GeolocateButtonProps = {
  className?: string;
};

export function GeolocateButton({ className }: GeolocateButtonProps) {
  const map = useGeoloniaMap();
  const controlRef = useRef<GeolocateControl | null>(null);
  const [, setHasError] = useState(false);

  useEffect(() => {
    if (!map) {
      return;
    }

    const control = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
      showUserLocation: true,
    });

    const handleError = (_event: GeolocationPositionError) => {
      // R4.8: 位置情報の拒否・取得失敗時もUIをブロックせず通常表示を継続する
      setHasError(true);
    };

    control.on('error', handleError);
    map.addControl(control, 'top-right');
    controlRef.current = control;

    return () => {
      control.off('error', handleError);
      map.removeControl(control);
      controlRef.current = null;
    };
  }, [map]);

  return (
    <Button
      type="button"
      variant="default"
      size="icon"
      data-testid="geolocate-button"
      aria-label="現在地を表示"
      className={className}
      onClick={() => controlRef.current?.trigger()}
    >
      <LocateFixed data-icon="inline-start" />
    </Button>
  );
}
