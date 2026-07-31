import { useEffect, useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { MapGrid } from './components/MapGrid';
import { useSharedScale } from './hooks/useSharedScale';
import { scaleDenominatorAtZ0 } from './lib/scale';
import type { City, GeocodedCity, GeocodeProvider } from './lib/types';

const CITIES_STORAGE_KEY = 'map-compare:cities';
const PROVIDER_STORAGE_KEY = 'map-compare:geocoder';
const DUPLICATE_EPSILON = 1e-4;
const DEFAULT_PROVIDER: GeocodeProvider = 'photon';

function loadInitialCities(): City[] {
  try {
    const raw = localStorage.getItem(CITIES_STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is City =>
        typeof c === 'object' &&
        c !== null &&
        typeof (c as City).id === 'string' &&
        typeof (c as City).name === 'string' &&
        typeof (c as City).displayName === 'string' &&
        typeof (c as City).lat === 'number' &&
        typeof (c as City).lon === 'number',
    );
  } catch {
    return [];
  }
}

/** 统一比例尺显示，取 3 位有效数字，如 1:546,000 */
function formatScale(z0: number): string {
  const n = scaleDenominatorAtZ0(z0);
  return `1:${Number(n.toPrecision(3)).toLocaleString('en-US')}`;
}

function loadInitialProvider(): GeocodeProvider {
  try {
    const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
    return raw === 'nominatim' || raw === 'photon' ? raw : DEFAULT_PROVIDER;
  } catch {
    return DEFAULT_PROVIDER;
  }
}

export default function App() {
  const [cities, setCities] = useState<City[]>(loadInitialCities);
  const [provider, setProvider] = useState<GeocodeProvider>(loadInitialProvider);
  const { z0, setZ0 } = useSharedScale();

  useEffect(() => {
    try {
      localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(cities));
    } catch {
      // 持久化失败可忽略
    }
  }, [cities]);

  useEffect(() => {
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
    } catch {
      // 持久化失败可忽略
    }
  }, [provider]);

  function addCity(result: GeocodedCity): string | null {
    const duplicate = cities.some(
      (c) => Math.abs(c.lat - result.lat) < DUPLICATE_EPSILON && Math.abs(c.lon - result.lon) < DUPLICATE_EPSILON,
    );
    if (duplicate) {
      return '该城市已在列表中';
    }
    setCities([...cities, { ...result, id: crypto.randomUUID() }]);
    return null;
  }

  function removeCity(id: string) {
    setCities((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>城市大小对比</h1>
        <SearchBar cities={cities} provider={provider} onProviderChange={setProvider} onAdd={addCity} onRemove={removeCity} />
        <div className="global-zoom">
          <button type="button" onClick={() => setZ0(z0 - 1)} aria-label="缩小">
            −
          </button>
          <span className="scale-label" title="所有地图的统一比例尺">
            {formatScale(z0)}
          </span>
          <button type="button" onClick={() => setZ0(z0 + 1)} aria-label="放大">
            ＋
          </button>
        </div>
      </header>
      <MapGrid cities={cities} z0={z0} onZ0Change={setZ0} onRemove={removeCity} />
    </div>
  );
}
