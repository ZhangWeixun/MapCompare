import type { GeocodedCity, GeocodeProvider } from './types';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

/**
 * 搜索城市，返回最佳匹配；无结果返回 null。
 * 网络错误或 HTTP 非 2xx 抛异常（由调用方捕获并提示）。
 * provider: photon（国内可直连）或 nominatim（官方，需外网）。
 */
export async function geocodeCity(query: string, provider: GeocodeProvider): Promise<GeocodedCity | null> {
  return provider === 'photon' ? geocodeWithPhoton(query) : geocodeWithNominatim(query);
}

async function geocodeWithNominatim(query: string): Promise<GeocodedCity | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh,en&q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Nominatim 请求失败: HTTP ${response.status}`);
  }
  const results = (await response.json()) as NominatimResult[];
  if (results.length === 0) {
    return null;
  }
  const first = results[0];
  return {
    name: first.display_name.split(',')[0],
    displayName: first.display_name,
    lat: parseFloat(first.lat),
    lon: parseFloat(first.lon),
  };
}

async function geocodeWithPhoton(query: string): Promise<GeocodedCity | null> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Photon 请求失败: HTTP ${response.status}`);
  }
  const data = (await response.json()) as { features?: PhotonFeature[] };
  if (!Array.isArray(data.features) || data.features.length === 0) {
    return null;
  }
  const first = data.features[0];
  const name = first.properties.name ?? query;
  const parts = [first.properties.name, first.properties.city, first.properties.state, first.properties.country].filter(
    (p): p is string => Boolean(p),
  );
  const displayName = [...new Set(parts)].join(', ');
  const [lon, lat] = first.geometry.coordinates;
  return { name, displayName, lat, lon };
}
