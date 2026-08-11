import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { GeoloniaMap as GeoloniaMapSDK, keyring } from '@geolonia/embed/core';
import type { Map as MaplibreMap } from 'maplibre-gl';

export const JAPAN_CENTER: [number, number] = [138.5, 37.0];
export const JAPAN_ZOOM = 4.5;

const GeoloniaMapContext = createContext<MaplibreMap | null>(null);

export function useGeoloniaMap(): MaplibreMap | null {
  return useContext(GeoloniaMapContext);
}

export type GeoloniaMapProps = {
  className?: string;
  children?: ReactNode;
  initialCenter?: [number, number];
  initialZoom?: number;
};

export function GeoloniaMap({
  className,
  children,
  initialCenter = JAPAN_CENTER,
  initialZoom = JAPAN_ZOOM,
}: GeoloniaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<MaplibreMap | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // @geolonia/embed/core の実APIはコンストラクタオプションのapiKeyを無視するため、
    // 生成前にkeyring.apiKeyへ設定する必要がある（node_modules/@geolonia/embed/README.md）
    keyring.apiKey = import.meta.env.VITE_GEOLONIA_API_KEY;
    const mapOptions = {
      container,
      center: initialCenter,
      zoom: initialZoom,
    };
    const instance = new GeoloniaMapSDK(mapOptions);
    setMap(instance);

    return () => {
      instance.remove();
    };
    // マウント時1回のみ生成する契約（初期center/zoomの変更で再生成しない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GeoloniaMapContext.Provider value={map}>
      <div ref={containerRef} data-testid="geolonia-map-container" className={className} />
      {children}
    </GeoloniaMapContext.Provider>
  );
}
