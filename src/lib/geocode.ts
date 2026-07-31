import type { GeocodedCity } from './types';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * 用 Nominatim 搜索城市，返回最佳匹配；无结果返回 null。
 * 网络错误或 HTTP 非 2xx 抛异常（由调用方捕获并提示）。
 */
export async function geocodeCity(query: string): Promise<GeocodedCity | null> {
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
