# 北京地铁 · 全网实时模拟

基于时刻表的北京地铁全网实时运行模拟，覆盖 28 条线路、539 个站点。

![28 Lines](https://img.shields.io/badge/线路-28-red) ![539 Stations](https://img.shields.io/badge/站点-539-blue) ![Tests](https://img.shields.io/badge/测试-31/31-green)

## 在线预览

**https://wonders2002ok.github.io/beijing_realtime_subway_map/index.html**

也可以直接打开 `index.html` 在浏览器中查看。

## 最近更新 🚀

### 1. 模拟引擎升级
- **时间推拉模拟**：新增时间进度条，支持在全天 24 小时内自由拖拽跳转。
- **播放控制**：支持模拟时间的播放与暂停。
- **多倍速调节**：提供 1x 到 300x 的速度选择，支持极速预览全天运行状况。
- **回到实时**：一键切换回本地系统时间同步。

### 2. 视觉表现优化
- **贝塞尔曲线轨道**：引入 `Turf.js`，基于站点坐标自动生成平滑的贝塞尔曲线轨道，告别生硬的直线模型。
- **平滑转向系统**：列车图标会沿轨道切线平滑旋转，转弯过程更加自然逼真。
- **60 FPS 流畅动画**：利用 CSS3 硬件加速技术，列车在移动和旋转时保持极高的视觉流畅度。
- **最新版高德地图**：升级至 `webrd` 域名的标准版矢量地图（style=8），地图数据更新更及时。

### 3. 交互与功能
- **全网线路筛选**：右侧面板实时展示各线路在线列车数，支持点击切换高亮、双击切换显示/隐藏。
- **机场线优化**：修正首都机场线（PEK）和大兴机场线（PKX）的列车编号前缀。
- **信息弹窗**：点击站点或列车可查看详细的实时状态、首末班车时刻表信息。
- **双休日回退**：首都机场线等缺失双休日数据的线路自动使用工作日时刻表（显示 ⚠️ 标记）。

### 4. 项目结构重构
- **模块化拆分**：将 991 行单文件 `app.js` 拆分为 `sim-engine.js`、`map-layers.js`、`ui-panel.js`、`app.js` 四个模块，通过 `BS` 命名空间共享状态。
- **列车 ID 自动生成**：`build.py` 根据文件名自动生成 `line.code`，前端不再需要手动维护 `LINE_CODES` 映射表。
- **自动化测试**：Python（pytest，15 个测试）+ Node（assert，16 个测试），覆盖核心算法。

## 功能特性

- **全网覆盖**：28 条线路（含房山线、亦庄线、燕房线、S1 线、西郊线、亦庄 T1 线、首都机场线、大兴机场线）
- **实时模拟**：基于列车时刻表推算，每辆列车的位置精确到秒。
- **三角形方向指示**：列车图标尖角始终指向行驶方向。
- **平滑动画**：帧级插值，列车在该时刻实际轨道位置平滑移动。
- **环线支持**：2 号线、10 号线环线列车可循环运行。
- **昼夜切换**：根据时间自动切换底图风格（白天柔和降饱和 / 夜晚反色暗灰去色），地铁线路在任何时段都清晰可辨。
- **站点搜索**：支持按名称搜索站点（拼音、首字母），点击结果自动定位至该站并高亮。
- **永久站名标注**：高缩放级别（≥14）自动显示所有站名，低缩放级别隐藏防止重叠。
- **URL 状态分享**：当前地图视角和模拟时间自动保存到 URL，分享链接即见。
- **移动端适配**：手机上自动切换为底部抽屉面板，支持滑出收起。

## 数据来源与外部依赖

### [Beijing-Subway-Tools](https://github.com/Mick235711/Beijing-Subway-Tools)

核心时刻表数据来源于 [Beijing-Subway-Tools](https://github.com/Mick235711/Beijing-Subway-Tools)（MIT License），包含：
- JSON5 格式时刻表（使用 delta 压缩编码）。
- 多交路支持（全程车 / 快车 / 库车等）。
- 工作日 / 双休日的分组调度。

**注意**：本仓库不直接包含时刻表原始数据。构建时需要确保 `Beijing-Subway-Tools` 已克隆到本仓库的同级目录：
`../Beijing-Subway-Tools/data/beijing/`

## 地图服务

项目使用 [高德地图](https://www.amap.com/) 提供的瓦片服务，基于 **GCJ-02** 坐标系：
- **白天模式**：`webrd` 域名标准矢量地图（style=8），CSS 滤镜轻微降饱和以突出地铁线路。
- **夜晚模式**：对矢量地图应用 CSS 反色 + 去色滤镜，实现暗色主题，避免底图主干道颜色与地铁线冲突。
- **站点坐标**：采集自高德地图搜索 API，确保与底层瓦片地图完全对齐。

## 构建方式

如果需要重新生成 `js/data.js` 或 `index.html`，请按以下步骤操作：

1. **环境准备**：
   ```bash
   pip install pyjson5
   ```

2. **同步时刻表数据**（建议将数据仓库克隆在本项目同级目录）：
   ```bash
   git clone https://github.com/Mick235711/Beijing-Subway-Tools.git ../Beijing-Subway-Tools
   ```

3. **（可选）获取 T1 线精确坐标**：
   ```bash
   python scripts/fetch_coords.py <你的高德API Key>
   ```
   输出 `data/amap_fetched_coords.json`，`build.py` 会自动加载。

4. **运行构建脚本**：
   ```bash
   python scripts/build.py
   ```

## 运行测试

```bash
# Python 测试（构建脚本核心算法）
python -m pytest scripts/tests/ -v

# JavaScript 测试（模拟引擎核心函数）
node js/tests/test-sim.js
```

## 项目结构

```
beijing-subway/
├── css/                  # 样式目录
│   └── style.css
├── js/                   # 脚本目录
│   ├── data.js           # 构建生成的时刻表数据
│   ├── data.template.js  # 数据注入模板
│   ├── sim-engine.js     # 模拟引擎：时刻表推算、位置插值、主循环
│   ├── map-layers.js     # 地图渲染：线路/站点/列车、主题切换、高亮
│   ├── ui-panel.js       # UI 交互：搜索、控制面板、URL 状态、移动端
│   ├── app.js            # 入口：启动模拟循环
│   └── tests/            # JS 测试
│       └── test-sim.js
├── data/                 # 静态地理数据
│   ├── amap_beijing.json # 高德站点坐标
│   ├── schedule.json     # 时刻表原始数据
│   └── amap_fetched_coords.json  # API 获取的坐标修正（可选）
├── scripts/              # 工具与构建脚本
│   ├── build.py          # 主构建脚本（含 line.code 自动生成）
│   ├── fetch_coords.py   # 高德 POI API 坐标采集脚本
│   └── tests/            # Python 测试
│       └── test_build.py
├── template.html         # HTML 模板
├── index.html            # 入口文件
├── README.md
└── .gitignore
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 前端框架 | Leaflet.js |
| 地理计算 | Turf.js (Bezier Spline) |
| 中文拼音 | pinyin-pro |
| 样式处理 | 原生 CSS (CSS3 Transitions) |
| 逻辑处理 | 原生 JavaScript（模块化 IIFE） |
| 构建系统 | Python 3 + pyjson5 |
| 测试框架 | pytest（Python）+ Node assert（JS） |
| 数据来源 | Beijing-Subway-Tools |

## 架构设计

### 模块职责

```
data.js ─── LINES 全局数据
    │
    ├─ sim-engine.js ─── BS 命名空间
    │   • 时刻表推算 (getActiveTrains)
    │   • 位置插值 (interp / interpAlongPath)
    │   • 主循环 (tick, 60fps)
    │   • 时间控制 (播放/暂停/倍速)
    │
    ├─ map-layers.js ─── BS 命名空间
    │   • 地图初始化 (Leaflet + 高德瓦片)
    │   • 线路/站点/列车渲染
    │   • 昼夜主题切换
    │   • 高亮与筛选
    │
    └─ ui-panel.js ─── BS 命名空间
        • 搜索（拼音匹配）
        • 控制面板事件绑定
        • URL 状态同步
        • 移动端抽屉

app.js ─── 入口：BS.startSimulation()
```

模块间通过 `window.BS` 命名空间共享状态。

## 已知限制

- 首都机场线缺失双休日时刻表数据（已添加工作日回退，显示 ⚠️ 标记）。
- 亦庄 T1 线部分站点使用近似坐标（可运行 `fetch_coords.py` 获取精确坐标）。

## License

本项目代码采用 MIT License。时刻表数据来源于 [Beijing-Subway-Tools](https://github.com/Mick235711/Beijing-Subway-Tools)（MIT License）。
