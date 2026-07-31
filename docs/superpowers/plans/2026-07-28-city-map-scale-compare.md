# 多城市同比例尺地图对比工具 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个纯前端网页工具：并排展示任意多个城市的地图，所有地图严格保持同一地面比例尺（按纬度校正），可直观对比城市真实大小。

**Architecture:** React + TypeScript 单页应用，无后端。每块地图是一个独立的 MapLibre GL JS 实例；全局只存一个标量 z0（等效赤道 zoom），各图通过 `zoom = z0 + log2(cos(lat))` 换算实现严格同比例尺；城市列表与 z0 持久化到 localStorage。

**Tech Stack:** React 18 + TypeScript + Vite、MapLibre GL JS v5、OpenFreeMap 矢量瓦片（免 key）、Nominatim 地理编码、vitest。

**Spec:** `docs/superpowers/specs/2026-07-28-city-map-scale-compare-design.md`

**约定：**
- 所有命令在项目根目录 `/Users/zhangweixun/张维洵/Immigration/map_compare` 下执行
- 每个 Task 末尾都有 commit 步骤，不要跳过
- 项目不引入 ESLint/UI 框架，样式为原生 CSS

---

## Chunk 1: 项目骨架与比例尺核心

### Task 1: 项目脚手架

手工创建全部脚手架文件（不用 `npm create vite`，避免交互式提示覆盖已有 docs/ 目录）。

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/vite-env.d.ts`
- Create: `src/main.tsx`
- Create: `src/index.css`
- Create: `src/App.tsx`（占位，Task 6 替换）

- [ ] **Step 1: 创建 `package.json`**

```json
{
  "name": "map-compare",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "maplibre-gl": "^5.6.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.2",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: 创建 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: 创建 `index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>城市大小对比</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: 创建 `.gitignore`**

```
node_modules
dist
*.local
.DS_Store
```

- [ ] **Step 6: 创建 `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 7: 创建 `src/main.tsx`（最终版，后续不改）**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 8: 创建 `src/index.css`（占位，Task 6 替换为完整样式）**

```css
body {
  margin: 0;
}
```

- [ ] **Step 9: 创建占位 `src/App.tsx`**

```tsx
export default function App() {
  return <div>项目初始化成功</div>;
}
```

- [ ] **Step 10: 安装依赖**

Run: `npm install`
Expected: 成功结束，生成 `node_modules/` 和 `package-lock.json`，无 ERR

- [ ] **Step 11: 验证 dev server 能启动**

Run（后台启动）: `npm run dev`
然后: `curl -s http://localhost:5173/`
Expected: 返回的 HTML 中包含 `<div id="root"></div>`；验证后 kill 掉 dev server 进程

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore src/
git commit -m "feat: Vite + React + TS 项目脚手架，接入 maplibre-gl"
```

### Task 2: 比例尺换算库 scale.ts（TDD）

核心纯函数，严格按 spec §4.2 实现。

**Files:**
- Create: `src/lib/scale.ts`
- Test: `src/lib/scale.test.ts`

- [ ] **Step 1: 先写失败的测试 `src/lib/scale.test.ts`**

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test`
Expected: FAIL，报错无法解析模块 `./scale`（如 `Failed to resolve import "./scale"`）

- [ ] **Step 3: 实现 `src/lib/scale.ts`**

```ts
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test`
Expected: PASS，`Test Files 1 passed (1)`，`Tests 13 passed (13)`

- [ ] **Step 5: Commit**

```bash
git add src/lib/scale.ts src/lib/scale.test.ts
git commit -m "feat: 比例尺换算纯函数（纬度校正），含 13 个单测"
```

---

## Chunk 2: 数据层（类型、地理编码、共享比例尺 hook）

### Task 3: 共享类型 + Nominatim 地理编码

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/geocode.ts`

- [ ] **Step 1: 创建 `src/lib/types.ts`**

```ts
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
```

- [ ] **Step 2: 创建 `src/lib/geocode.ts`**

```ts
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
```

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无输出，退出码 0（说明全部源码编译通过）

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/geocode.ts
git commit -m "feat: 共享类型与 Nominatim 地理编码封装"
```

### Task 4: useSharedScale hook

全局 z0 状态 + 钳制 + localStorage 持久化（300ms debounce）。

**Files:**
- Create: `src/hooks/useSharedScale.ts`

- [ ] **Step 1: 创建 `src/hooks/useSharedScale.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'map-compare:z0';
const MIN_Z0 = 2;
const MAX_Z0 = 18;
const DEFAULT_Z0 = 10;
const PERSIST_DEBOUNCE_MS = 300;

function clampZ0(z0: number): number {
  return Math.min(MAX_Z0, Math.max(MIN_Z0, z0));
}

function loadInitialZ0(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_Z0;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return DEFAULT_Z0;
    return clampZ0(parsed);
  } catch {
    return DEFAULT_Z0;
  }
}

/** 管理全局统一比例尺 z0（等效赤道 zoom），持久化到 localStorage（debounce） */
export function useSharedScale(): { z0: number; setZ0: (z0: number) => void } {
  const [z0, setZ0State] = useState<number>(loadInitialZ0);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  const setZ0 = useCallback((next: number) => {
    const clamped = clampZ0(next);
    setZ0State(clamped);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
      } catch {
        // 持久化失败可忽略（如隐私模式），不影响功能
      }
    }, PERSIST_DEBOUNCE_MS);
  }, []);

  return { z0, setZ0 };
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无输出，退出码 0

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSharedScale.ts
git commit -m "feat: useSharedScale hook，全局 z0 状态与持久化"
```

---

## Chunk 3: UI 组件与集成

### Task 5: CityMap 组件（单城市地图实例）

每张地图创建一次（按 city.id），z0 同步走独立 effect；缩放事件反算 z0 上报。

**Files:**
- Create: `src/components/CityMap.tsx`

- [ ] **Step 1: 创建 `src/components/CityMap.tsx`**

```tsx
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
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无输出，退出码 0

- [ ] **Step 3: Commit**

```bash
git add src/components/CityMap.tsx
git commit -m "feat: CityMap 组件，MapLibre 实例与 z0 双向同步"
```

### Task 6: SearchBar、MapGrid、App 集成与完整样式

**Files:**
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/MapGrid.tsx`
- Modify: `src/App.tsx`（整体替换占位内容）
- Modify: `src/index.css`（整体替换占位内容）

- [ ] **Step 1: 创建 `src/components/SearchBar.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import type { City, GeocodedCity } from '../lib/types';
import { geocodeCity } from '../lib/geocode';

interface SearchBarProps {
  cities: City[];
  /** 返回 null 表示添加成功；返回字符串为错误提示（如重复） */
  onAdd: (result: GeocodedCity) => string | null;
  onRemove: (id: string) => void;
}

export function SearchBar({ cities, onAdd, onRemove }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setError(null);
    try {
      const result = await geocodeCity(q);
      if (result === null) {
        setError('未找到该城市，试试英文地名或更具体的名称');
        return;
      }
      const addError = onAdd(result);
      if (addError) {
        setError(addError);
      } else {
        setQuery('');
      }
    } catch {
      setError('搜索失败，请检查网络后重试');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入城市名，如：北京 / Vancouver / 東京"
          disabled={searching}
        />
        <button type="submit" disabled={searching || !query.trim()}>
          {searching ? '搜索中…' : '添加'}
        </button>
      </form>
      {error && <div className="search-error">{error}</div>}
      {cities.length > 0 && (
        <div className="city-chips">
          {cities.map((c) => (
            <span key={c.id} className="city-chip" title={c.displayName}>
              {c.name}
              <button type="button" onClick={() => onRemove(c.id)} aria-label={`删除 ${c.name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建 `src/components/MapGrid.tsx`**

```tsx
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
```

- [ ] **Step 3: 整体替换 `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { MapGrid } from './components/MapGrid';
import { useSharedScale } from './hooks/useSharedScale';
import { scaleDenominatorAtZ0 } from './lib/scale';
import type { City, GeocodedCity } from './lib/types';

const CITIES_STORAGE_KEY = 'map-compare:cities';
const DUPLICATE_EPSILON = 1e-4;

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

export default function App() {
  const [cities, setCities] = useState<City[]>(loadInitialCities);
  const { z0, setZ0 } = useSharedScale();

  useEffect(() => {
    try {
      localStorage.setItem(CITIES_STORAGE_KEY, JSON.stringify(cities));
    } catch {
      // 持久化失败可忽略
    }
  }, [cities]);

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
        <SearchBar cities={cities} onAdd={addCity} onRemove={removeCity} />
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
```

- [ ] **Step 4: 整体替换 `src/index.css`**

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
  background: #f5f6f8;
  color: #222;
}

.app {
  max-width: 1600px;
  margin: 0 auto;
  padding: 16px;
}

.app-header h1 {
  font-size: 20px;
  margin: 0 0 12px;
}

.search-form {
  display: flex;
  gap: 8px;
}

.search-form input {
  flex: 1;
  max-width: 420px;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.search-form button {
  padding: 8px 16px;
  font-size: 14px;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}

.search-form button:disabled {
  background: #9db7ea;
  cursor: default;
}

.search-error {
  color: #dc2626;
  font-size: 13px;
  margin-top: 6px;
}

.city-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.city-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #e5e7eb;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 13px;
}

.city-chip button {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #6b7280;
  padding: 0 2px;
}

.global-zoom {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.global-zoom button {
  width: 32px;
  height: 32px;
  font-size: 18px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.scale-label {
  font-variant-numeric: tabular-nums;
  font-size: 14px;
  color: #374151;
}

.map-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.city-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.city-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
}

.city-name {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.city-lat {
  color: #6b7280;
  font-size: 12px;
  flex-shrink: 0;
}

.city-remove {
  margin-left: auto;
  border: none;
  background: none;
  font-size: 16px;
  color: #9ca3af;
  cursor: pointer;
  flex-shrink: 0;
}

.city-remove:hover {
  color: #dc2626;
}

.city-map {
  height: 480px;
}

.empty-state {
  margin-top: 80px;
  text-align: center;
  color: #6b7280;
  font-size: 15px;
}
```

- [ ] **Step 5: 类型检查 + 单元测试 + 构建**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc 无错误；13 个测试全部通过；`vite build` 成功输出 `dist/`，无 ERROR

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: 搜索栏、地图网格与 App 集成，完整页面样式"
```

### Task 7: 端到端手动验证

对照 spec §8 的验证清单逐项确认。

**Files:** 无（仅验证）

- [ ] **Step 1: 启动 dev server**

Run（后台）: `npm run dev`
然后浏览器打开 `http://localhost:5173/`

- [ ] **Step 2: 逐项手动验证**

1. 搜索添加「北京」「新加坡」「赫尔辛基」，三张地图卡片并排显示，初始视野都在对应城市
2. 在任意一张图上滚轮缩放，其余图实时跟随；三张图左下角比例尺条显示的刻度始终一致（如都是 2 km）
3. 各图分别拖动平移，互不影响
4. 点卡片右上角 × 删除一张图，其余图不受影响，且无报错
5. 刷新页面，城市列表和比例尺恢复
6. 搜索一个不存在的地名（如「asdfghjkl」），显示「未找到该城市…」；重复添加同一城市，显示「该城市已在列表中」
7. 顶部 − / ＋ 按钮可整体缩放，比例尺文本（如 1:546,000）随之变化

Expected: 7 项全部符合；浏览器 console 无红色报错

- [ ] **Step 3: 验证完成后停止 dev server，最终确认仓库状态**

Run: `git status`
Expected: 工作区干净（nothing to commit, working tree clean）
