/** 已添加到对比列表的城市 */
export interface City {
  id: string; // crypto.randomUUID()
  name: string; // 短名（display_name 第一段）
  displayName: string; // Nominatim 完整地名
  lat: number;
  lon: number;
}

/** geocode 返回的原始结果（尚未分配 id） */
export type GeocodedCity = Omit<City, 'id'>;
