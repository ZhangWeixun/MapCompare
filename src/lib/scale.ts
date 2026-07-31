const METERS_PER_PIXEL_AT_EQUATOR_ZOOM0 = 156543.03392;
const MAX_LATITUDE = 85;

/** 纬度钳制到 Web 墨卡托有效范围附近，避免 cos(lat) 趋近 0 */
export function clampLat(lat: number): number {
  return Math.min(MAX_LATITUDE, Math.max(-MAX_LATITUDE, lat));
}

/** 由等效赤道 zoom（z0）求某纬度地图应有的实际 zoom，使各地图米/像素一致 */
export function zoomForLatitude(z0: number, lat: number): number {
  return z0 + Math.log2(Math.cos((clampLat(lat) * Math.PI) / 180));
}

/** 由某纬度地图当前的实际 zoom 反算 z0（zoomForLatitude 的逆运算） */
export function z0FromZoom(zoom: number, lat: number): number {
  return zoom - Math.log2(Math.cos((clampLat(lat) * Math.PI) / 180));
}

/** z0 对应的地面分辨率（米/像素，赤道处） */
export function resolutionAtZ0(z0: number): number {
  return METERS_PER_PIXEL_AT_EQUATOR_ZOOM0 / 2 ** z0;
}

/** z0 对应的比例尺分母（OGC 标准像素 0.28mm），用于显示 1:N */
export function scaleDenominatorAtZ0(z0: number): number {
  return resolutionAtZ0(z0) / 0.00028;
}
