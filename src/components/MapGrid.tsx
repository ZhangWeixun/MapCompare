import type { City } from '../lib/types';
import { CityMap } from './CityMap';

interface MapGridProps {
  cities: City[];
  z0: number;
  onZ0Change: (z0: number) => void;
  onRemove: (id: string) => void;
}

export function MapGrid({ cities, z0, onZ0Change, onRemove }: MapGridProps) {
  if (cities.length === 0) {
    return <div className="empty-state">在上方搜索并添加城市，开始同比例尺对比</div>;
  }
  return (
    <div className="map-grid">
      {cities.map((city) => (
        <CityMap key={city.id} city={city} z0={z0} onZ0Change={onZ0Change} onRemove={onRemove} />
      ))}
    </div>
  );
}
