import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { City } from '../lib/types';
import { z0FromZoom, zoomForLatitude } from '../lib/scale';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const ZOOM_EPSILON = 1e-4;
const MIN_MAP_ZOOM = 0;
const MAX_MAP_ZOOM = 18;

interface CityMapProps {
  city: City;
  z0: number;
  onZ0Change: (z0: number) => void;
  onRemove: (id: string) => void;
}

export function CityMap({ city, z0, onZ0Change, onRemove }: CityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  // zoom 事件回调中长期持有最新 onZ0Change，避免闭包过期
  const onZ0ChangeRef = useRef(onZ0Change);

  useEffect(() => {
    onZ0ChangeRef.current = onZ0Change;
  });

  // 创建地图实例（每个城市卡片只创建一次；初始 zoom 取挂载时的 z0 换算值）
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [city.lon, city.lat],
      zoom: zoomForLatitude(z0, city.lat),
      minZoom: MIN_MAP_ZOOM,
      maxZoom: MAX_MAP_ZOOM,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('zoom', () => {
      onZ0ChangeRef.current(z0FromZoom(map.getZoom(), city.lat));
    });
    map.on('error', (event) => {
      console.error(`[CityMap:${city.name}] 地图加载错误`, event.error);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // 仅在挂载/城市变化时创建（deps 故意不含 z0/city.lat，初始 zoom 取挂载时的换算值）
  }, [city.id]);

  // z0 同步：与目标 zoom 不同才 setZoom。
  // 因两公式互逆，触发缩放的地图自身此判断为空操作，不会产生回环。
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const target = zoomForLatitude(z0, city.lat);
    if (Math.abs(map.getZoom() - target) > ZOOM_EPSILON) {
      map.setZoom(target);
    }
  }, [z0, city.lat]);

  const latLabel = `${Math.abs(city.lat).toFixed(1)}°${city.lat >= 0 ? 'N' : 'S'}`;

  return (
    <div className="city-card">
      <div className="city-card-header" title={city.displayName}>
        <span className="city-name">{city.name}</span>
        <span className="city-lat">{latLabel}</span>
        <button className="city-remove" onClick={() => onRemove(city.id)} aria-label={`删除 ${city.name}`}>
          ×
        </button>
      </div>
      <div ref={containerRef} className="city-map" />
    </div>
  );
}
