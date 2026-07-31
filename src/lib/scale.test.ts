import { describe, expect, it } from 'vitest';
import { clampLat, resolutionAtZ0, scaleDenominatorAtZ0, z0FromZoom, zoomForLatitude } from './scale';

describe('zoomForLatitude', () => {
  it('赤道处 zoom 等于 z0', () => {
    expect(zoomForLatitude(10, 0)).toBe(10);
  });

  it('北纬 60° 处 zoom 比 z0 低 1', () => {
    expect(zoomForLatitude(10, 60)).toBeCloseTo(9, 10);
  });
});

describe('z0FromZoom', () => {
  it.each([-60, -30, 0, 1.35, 39.9, 60, 75])('与 zoomForLatitude 互逆（lat=%s）', (lat) => {
    const z0 = 12.34;
    expect(z0FromZoom(zoomForLatitude(z0, lat), lat)).toBeCloseTo(z0, 10);
  });
});

describe('clampLat', () => {
  it('钳制到 ±85', () => {
    expect(clampLat(89)).toBe(85);
    expect(clampLat(-90)).toBe(-85);
    expect(clampLat(39.9)).toBe(39.9);
  });
});

describe('resolutionAtZ0 / scaleDenominatorAtZ0', () => {
  it('z0=0 时赤道分辨率为 156543.03392 m/px', () => {
    expect(resolutionAtZ0(0)).toBeCloseTo(156543.03392, 5);
  });

  it('z0=1 时分辨率减半', () => {
    expect(resolutionAtZ0(1)).toBeCloseTo(156543.03392 / 2, 5);
  });

  it('比例尺分母 = 分辨率 / 0.00028', () => {
    expect(scaleDenominatorAtZ0(10)).toBeCloseTo(resolutionAtZ0(10) / 0.00028, 6);
  });
});
