# MapCompare 城市大小对比

在相同比例尺下，并排对比全球任意多个城市的地图大小。

Compare any number of cities side by side on maps at the exact same ground scale — with per-latitude correction, so Singapore and Copenhagen are truly comparable.

## 功能特性

- 🔍 搜索添加全球任意城市，数量不限，地图卡片并排排列
- 📏 **严格同比例尺**：所有地图的"米/像素"完全一致（按纬度做墨卡托投影校正），缩放任意一张，其余实时联动
- 🖱️ 每张地图独立平移，自由选择对比区域
- 🌐 双地名搜索源（Photon / Nominatim）按网络环境切换
- 💾 城市列表、比例尺、搜索源选择自动保存在浏览器本地

## 技术栈

- React 18 + TypeScript + Vite
- [MapLibre GL JS](https://maplibre.org/) 矢量地图渲染
- [OpenFreeMap](https://openfreemap.org/) 矢量瓦片（基于 OpenStreetMap 数据，免 API Key）
- [Photon](https://photon.komoot.io/) / [Nominatim](https://nominatim.openstreetmap.org/) 地名解析
- vitest 单元测试

纯前端静态应用，无后端、无密钥。

## 本地开发

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器（默认 http://localhost:5173）
npm test         # 运行单元测试
npm run build    # 类型检查 + 生产构建，产物在 dist/
```

## 部署

`npm run build` 产物 `dist/` 为纯静态文件，可部署到任意静态托管（Vercel、Netlify、GitHub Pages、对象存储等）。

## 核心原理：为什么需要纬度校正

Web 墨卡托投影中，同一 zoom 级别在不同纬度的地面分辨率不同（`resolution = 156543.03392 × cos(lat) / 2^zoom`）。本工具全局维护一个"等效赤道 zoom" z0，每张地图的实际 zoom 按 `zoom = z0 + log2(cos(lat))` 换算，使所有地图的地面分辨率严格一致。详见 [设计文档](docs/superpowers/specs/2026-07-28-city-map-scale-compare-design.md)。

## License

代码：[MIT](LICENSE) © 2026 Weixun Zhang

地图数据：© [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors（ODbL）
