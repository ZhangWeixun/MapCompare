# 多城市同比例尺地图对比工具 — 设计文档

日期：2026-07-28
状态：已获用户批准

## 1. 背景与目标

个人工具（非公开产品），服务于移民/搬家选城市等场景：在一张网页里并排展示任意多个城市的地图，**所有地图严格保持同一地面比例尺（米/像素完全一致）**，让用户直观对比城市的真实大小。

核心需求（已与用户确认）：
- 支持自定义搜索添加全球任意城市，数量不限
- 多块地图并排，直观对比（不画行政边界、不显示面积数字）
- 缩放联动：任一地图缩放，所有地图同步到相同比例尺
- 平移独立：每块地图各自平移选择对比区域
- 电脑浏览器本地使用（本地 dev server），无需部署

## 2. 非目标（YAGNI）

- 不做移动端适配（仅桌面浏览器）
- 不画城市边界轮廓、不显示面积/人口等数字
- 不做分享链接、多用户、账号体系
- 不做部署上线（先本地使用，后续需要再说）
- 不做距离测量、标注等附加工具

## 3. 技术选型

| 项 | 选择 | 理由 |
|---|---|---|
| 前端框架 | React 18 + TypeScript + Vite | 现代、热更新、个人项目标准选择 |
| 地图渲染 | MapLibre GL JS（v5） | 矢量渲染，原生支持小数 zoom，平滑缩放；用户选定 |
| 矢量瓦片 | OpenFreeMap（`https://tiles.openfreemap.org/styles/liberty`） | 免费、免 API Key、基于 OSM 全球数据 |
| 地理编码 | 双数据源可选：Photon（`https://photon.komoot.io/api`，默认）/ Nominatim（`https://nominatim.openstreetmap.org/search`） | 实测 Nominatim 在国内网络不可达，Photon 可直连；用户按网络情况在界面下拉框切换，选择持久化（2026-07-28 用户确认的变更） |
| 测试 | vitest | 与 Vite 集成，仅测纯函数 |
| 状态管理 | React 内置 state + 自定义 hook，不引入额外库 | 状态简单（城市列表 + 一个 zoom 值） |

## 4. 核心：比例尺同步

### 4.1 问题

Web 墨卡托投影中，同一 zoom 级别在不同纬度的地面分辨率不同：
`resolution(m/px) = 156543.03392 × cos(lat) / 2^zoom`
若不校正，赤道城市与高纬城市在同一 zoom 下比例尺可相差数倍，违背工具的核心目的。

### 4.2 方案

全局只存一个标量 **z0（等效赤道 zoom 级别）**，每块地图的实际 zoom 按城市纬度换算：

```
zoom_i = z0 + log2(cos(lat_i))        // 由 z0 求某地图应有的 zoom
z0     = zoom_i - log2(cos(lat_i))    // 由某地图当前 zoom 反算 z0
```

两式互为精确逆运算。高纬城市 cos(lat) < 1，实际 zoom 会被调低（拉远），从而所有地图的米/像素严格一致。

纯函数放在 `src/lib/scale.ts`：

```ts
export function zoomForLatitude(z0: number, lat: number): number
export function z0FromZoom(zoom: number, lat: number): number
export function resolutionAtZ0(z0: number): number          // 156543.03392 / 2^z0
export function scaleDenominatorAtZ0(z0: number): number     // resolutionAtZ0(z0) / 0.00028，用于显示 1:N
export function clampLat(lat: number): number                // 钳制到 ±85
```

边界规则：
- 纬度钳制到 ±85（Web 墨卡托极限附近，避免 cos→0）
- z0 钳制到 [2, 18]；单张地图 zoom 钳制到 [0, 18]（超出时比例尺严格性在极端纬度/级别下妥协，可接受）
- OpenFreeMap 瓦片 maxzoom 约为 14，超出部分由 MapLibre 自动 overzoom，无需处理

### 4.3 同步机制

- 每张地图监听 MapLibre 的 `zoom` 事件（滚轮/双击/按钮缩放都会触发）
- 地图 i 触发时：`z0' = z0FromZoom(map.getZoom(), lat_i)` → 更新全局 z0
- 所有地图（含触发者）在 effect 中计算目标 zoom：`target = zoomForLatitude(z0, lat)`，若 `|map.getZoom() - target| > 1e-4` 则 `map.setZoom(target)`
- 由于两公式互为逆运算，触发者自身的目标 zoom 等于其当前 zoom，effect 为空操作，**不会产生回环或手势对抗**，无需额外锁
- 平移不联动，各图独立中心

## 5. 组件设计

```
src/
├── main.tsx
├── App.tsx                  // 全局状态、布局
├── index.css                // 全局样式（原生 CSS，不引入 UI 框架）
├── components/
│   ├── SearchBar.tsx        // 搜索输入 + 已选城市 chips
│   ├── MapGrid.tsx          // 响应式网格容器
│   └── CityMap.tsx          // 单城市地图实例
├── hooks/
│   └── useSharedScale.ts    // z0 状态 + 持久化 + 变更回调
└── lib/
    ├── types.ts             // City 等共享类型
    ├── scale.ts             // 比例尺换算纯函数
    ├── scale.test.ts        // vitest 单测
    └── geocode.ts           // Nominatim 搜索封装
```

### 5.1 App

- 状态：`cities: City[]`、`z0: number`（来自 useSharedScale）
- 初始化：从 localStorage 读取 `map-compare:cities` 与 `map-compare:z0`（无则用默认值：空列表、z0 = 10）
- 布局：顶部 header（标题 + SearchBar + 全局缩放控件），下方 MapGrid
- 全局缩放控件：`-` / `+` 按钮（z0 ±1）+ 当前统一比例尺文本 `1:N`（N 由 scaleDenominatorAtZ0 计算，取 2-3 位有效数字）

### 5.2 数据模型

定义在 `src/lib/types.ts`：

```ts
interface City {
  id: string;          // crypto.randomUUID()
  name: string;        // 短名（Nominatim display_name 第一段）
  displayName: string; // 完整地名，用于 title 提示
  lat: number;
  lon: number;
}
```

### 5.3 SearchBar

- 输入框 + 添加按钮，Enter 提交；搜索中按钮置灰显示"搜索中…"
- 调用 geocode.ts，成功则把 geocode 结果回调给 App；**由 App 用 `crypto.randomUUID()` 补 id 构造 City 并追加**（追加前先做 §5.4 的去重判定）；失败在搜索栏下方显示红字提示（见 §7）
- 搜索框下方显示已添加城市 chips（短名 + × 删除）

### 5.4 geocode.ts

```ts
export async function geocodeCity(query: string, provider: GeocodeProvider): Promise<GeocodedCity | null>
```

- 两个数据源，按 provider 分派：
  - **Photon**（默认）：GET `https://photon.komoot.io/api/?q=<query>&limit=1`，GeoJSON 返回；短名取 `properties.name`，displayName 由 name/city/state/country 去重拼接；不支持国外城市中文译名（提示用户用英文名）
  - **Nominatim**：GET `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=zh,en&q=<query>`；短名取 `display_name.split(',')[0]`
- 结果为空返回 `null`；网络/HTTP 错误抛异常（由 SearchBar 捕获显示）
- provider 状态在 App 层，存 localStorage（`map-compare:geocoder`），SearchBar 下拉框切换；placeholder 随 provider 变化
- 重复添加判定（在 App 层）：新结果与已有城市 `|Δlat| < 1e-4 且 |Δlon| < 1e-4` 视为重复，提示并不添加

### 5.5 CityMap

- props：`{ city: City; z0: number; onZ0Change: (z0: number) => void; onRemove: (id: string) => void }`
- 挂载时创建 `maplibregl.Map`：`style: liberty`、`center: [lon, lat]`、`zoom: zoomForLatitude(z0, lat)`、`dragRotate: false`、`pitchWithRotate: false`、触摸/键盘默认
- 控件：`ScaleControl`（metric，真实比例尺条，各图应显示相同刻度——天然的自检）、`NavigationControl({ showCompass: false })`、默认 `AttributionControl`（OSM 版权要求，保留）
- `zoom` 事件 → `onZ0Change(z0FromZoom(map.getZoom(), city.lat))`
- z0 变化 effect → 按 §4.3 同步（epsilon 1e-4）
- 卸载时 `map.remove()`
- 卡片标题栏：城市短名 + 纬度（1 位小数，如 `39.9°N`）+ 右上角删除按钮

### 5.6 MapGrid

- CSS Grid：`grid-template-columns: repeat(auto-fit, minmax(400px, 1fr))`，卡片地图区高度 480px
- 空状态：居中提示"在上方搜索并添加城市，开始同比例尺对比"

### 5.7 useSharedScale

```ts
export function useSharedScale(): { z0: number; setZ0: (z0: number) => void }
```

- useState 懒初始化读 localStorage
- setZ0 时钳制到 [2, 18]
- 持久化：300ms debounce 写入 localStorage（避免缩放手势期间每帧写）

cities 的持久化在 App 中用 useEffect 直接写（变更频率低，无需 debounce）。

## 6. 数据流

1. 添加城市：SearchBar → geocodeCity → App 追加 City → MapGrid 渲染新 CityMap（初始 zoom 由当前 z0 换算）
2. 缩放：某 CityMap `zoom` 事件 → onZ0Change → useSharedScale 更新 z0 → 所有 CityMap effect 同步
3. 删除城市：chip × 或卡片删除按钮 → App 移除 → 对应 CityMap 卸载 `map.remove()`
4. 刷新恢复：localStorage → 初始 state → 各地图按 z0 换算重建

## 7. 错误处理

| 场景 | 行为 |
|---|---|
| 搜索无结果 | 搜索栏下方红字："未找到该城市，试试英文地名或更具体的名称" |
| 搜索网络/HTTP 失败 | 红字："搜索失败，请检查网络后重试" |
| 重复添加 | 红字："该城市已在列表中" |
| 瓦片/样式加载失败 | 依赖 MapLibre 内置重试；监听 `error` 事件仅 console 记录 |
| localStorage 数据损坏 | JSON.parse 包 try/catch，失败回退默认值 |

## 8. 测试

- `scale.test.ts`（vitest）：
  - 赤道（lat=0）时 zoomForLatitude(z0, 0) === z0
  - 60°N 时 zoom = z0 - 1
  - 往返换算恒等：z0FromZoom(zoomForLatitude(z0, lat), lat) ≈ z0（多组纬度）
  - clampLat 钳制 ±85；z0 钳制边界
- 手动验证清单：
  1. 添加 北京 / 新加坡 / 赫尔辛基，三图并排
  2. 任一图滚轮缩放，其余图实时跟随，三图比例尺条刻度始终一致
  3. 各图独立平移互不影响
  4. 删除城市卡片正确卸载
  5. 刷新页面后城市与比例尺恢复
  6. 搜索不存在地名/断网，提示正确

## 9. 项目初始化

- `npm create vite@latest . -- --template react-ts`（在当前空目录）
- 依赖：`maplibre-gl`；dev 依赖：`vitest`
- `maplibre-gl/dist/maplibre-gl.css` 在 main.tsx 引入
- 运行：`npm run dev`；测试：`npx vitest run`
