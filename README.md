# 北京地铁 · 全网实时模拟

基于时刻表的北京地铁全网实时运行模拟，覆盖 28 条线路、539 个站点。

![28 Lines](https://img.shields.io/badge/线路-28-red) ![539 Stations](https://img.shields.io/badge/站点-539-blue)

## 在线预览

直接打开 `index.html` 即可在浏览器中查看。

## 功能特性

- **全网覆盖**：28 条线路（含房山线、亦庄线、燕房线、S1 线、西郊线、亦庄 T1 线、首都机场线、大兴机场线）
- **实时模拟**：基于列车时刻表推算，每辆列车的位置精确到秒
- **三角形方向指示**：列车图标为三角形，指向行驶方向
- **平滑动画**：帧级插值，列车在站间平滑移动
- **环线支持**：2 号线、10 号线环线列车可循环运行
- **多种模式**：实时 / 早高峰 / 平峰 / 晚高峰，1x - 300x 速度调节
- **线路筛选**：可按线路显示/隐藏，快速查看单条线路运行状态

## 数据来源

### [Beijing-Subway-Tools](https://github.com/Mick235711/Beijing-Subway-Tools)

列车时刻表、线路站点等核心数据来源于 [Beijing-Subway-Tools](https://github.com/Mick235711/Beijing-Subway-Tools)（MIT License），包含：

- JSON5 格式时刻表（delta 压缩编码）
- 多交路支持（全程车 / 快车等）
- 工作日 / 双休日分组

## 地图服务

使用 [高德地图](https://www.amap.com/) 瓦片服务（GCJ-02 坐标系）：

- **暗色底图**：`https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7`
- 站点坐标同样来自高德地图搜索 API（GCJ-02），与底图天然对齐

## 项目结构

```
beijing-subway/
├── index.html           # 最终输出（可直接在浏览器打开）
├── template.html        # HTML 模板
├── build_v2.py          # 构建脚本（解析 JSON5 数据 → 注入模板）
├── amap_beijing.json    # 高德站点坐标数据库（GCJ-02）
└── README.md
```

## 构建方式

```bash
# 依赖
pip install pyjson5

# 确保 Beijing-Subway-Tools 已克隆到上级目录
git clone https://github.com/Mick235711/Beijing-Subway-Tools.git ../Beijing-Subway-Tools

# 构建
python build_v2.py
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 前端 | Leaflet.js + 原生 JavaScript |
| 底图 | 高德地图瓦片服务（暗色样式） |
| 构建 | Python 3 + pyjson5 |
| 数据 | Beijing-Subway-Tools JSON5 |

## 已知限制

- 首都机场线缺失双休日时刻表数据（原始数据中无此分组）
- 亦庄 T1 线部分站点使用近似坐标
- 站间路径为直线插值，非实际轨道走向
