# RoamDial

[English](README.md) | **中文** | [日本語](README_ja.md) | [한국어](README_ko.md)

> **项目性质**：本项目是 [roamdial.com](https://roamdial.com/) 的独立复刻（unofficial clone），仅用于学习与技术研究，与原站及其运营方无任何关联。原站是该产品的官方版本。

---

RoamDial 是一个把全球电台组织成三维流派星云和点阵地球的交互式 Web 应用。选择一颗光点，即可收听对应电台；地球与星云之间使用同一组粒子完成移动重组。

前端使用 React、Three.js、Vite，后端使用 Node.js、Express 和 SQLite。仓库自带电台目录快照，首次启动不依赖上游目录服务。

## 功能

- 流派星云与地球双视图，切换时按电台 ID 连续变换粒子。
- 首次进入时粒子落入地球，支持系统“减少动态效果”偏好。
- 拖动、缩放、准星停留锁定和音频驱动的亮度反馈。
- MP3/AAC 普通流及 HLS 电台播放，支持暂停、静音、收藏、搜索和分享。
- HLS 在 HTTPS 环境（如 fnOS FN Connect 公网访问）下同样可播：播放列表由服务端重写并经同源中继转发，不受浏览器混合内容策略影响。
- 流代理校验公网目标与重定向，HLS 在浏览器端按需加载播放器。
- Docker 与 fnOS `.fpk` 两种部署方式，SQLite 数据持久化。

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm run install:all
npm run build
npm start
```

打开 <http://localhost:8620>。首次启动如果数据目录为空，服务会从 `data/stations.json.gz` 自动初始化电台目录。

开发模式使用两个终端：

```bash
npm run server
npm run dev
```

Vite 开发服务器运行在 <http://localhost:5173>，并将 `/api` 代理到 `localhost:8620`。

## Docker

本地构建并启动：

```bash
docker compose up -d --build
```

默认访问地址为 <http://localhost:8621>。可通过环境变量更改宿主机端口：

```bash
ROAMDIAL_PORT=9000 docker compose up -d
```

Compose 使用命名卷 `roamdial_data` 保存 `roamdial.db`。更新容器不会覆盖电台目录和刷新记录。

从 Release 使用预构建镜像时，先导入对应架构的镜像归档，再启动随发布提供的 `roamdial-docker-compose.yaml`：

```bash
gunzip -c roamdial-app-linux-arm64.tar.gz | docker load
docker compose -f roamdial-docker-compose.yaml up -d
```

AMD64 设备将 `arm64` 替换为 `amd64`。

不使用 Compose 时：

```bash
docker run -d \
  --name roamdial \
  --restart unless-stopped \
  -p 8621:8620 \
  -v roamdial_data:/data \
  roamdial-app:0.0.1
```

健康检查：

```bash
curl http://localhost:8621/api/health
```

## fnOS

`deploy/fnos/roamdial` 是 fnOS 应用工程，通过 `fnpack 1.2.3` 生成 `.fpk`。安装包使用固定端口 `8621`，并声明 `roamdial/data` 持久化共享目录。

仓库发布页提供两种架构的安装包。镜像随安装包提供，不需要在安装后再从公网拉取。

```text
roamdial-fnos-x86.fpk
roamdial-fnos-arm.fpk
```

安装后可从 fnOS 应用中心打开 RoamDial，或访问：

```text
http://<fnOS-IP>:8621
```

如果 8621 已被占用，请先停止占用端口的服务。fnOS 包的生命周期脚本会导入对应架构的本地镜像并启动 Compose 项目。通过 FN Connect 公网（HTTPS）访问时，所有电台（含 HLS）均可正常播放。

### 重新生成发布产物

安装官方 `fnpack 1.2.3` 后运行：

```bash
scripts/build-release.sh
```

脚本会构建 `linux/amd64` 与 `linux/arm64` 镜像，导出 Docker 归档，生成两套 FPK，并写入 SHA-256 校验文件。manifest 的版本号自动跟随 `package.json`。产物位于 `artifacts/`。

发布前可校验全部产物：

```bash
cd artifacts
shasum -a 256 -c SHA256SUMS
```

## 配置

后端读取以下环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `8620` | 容器内监听端口 |
| `RD_DB` | `server/roamdial.db` | SQLite 数据库路径；容器内默认为 `/data/roamdial.db` |

调整宿主机端口时使用 Compose 的 `ROAMDIAL_PORT`，不要修改容器内 `PORT`。

## 数据与刷新

仓库中的 `data/stations.json.gz` 是 Radio Browser 目录快照，服务启动时仅在数据库为空时导入。运行中的服务每周尝试刷新热门与趋势电台；刷新失败不会阻止现有目录继续使用。

需要重新执行完整目录抓取时：

```bash
npm run ingest
```

城市锚点由 `tools/import-radio-garden.py`（一次性脚本，Python 3，无第三方依赖）从 Radio Garden 公开 places 接口生成，写入 `web/src/assets/city-anchors.json`，按国家和州/省把电台匹配到真实城市。Radio Garden 与 GeoNames 的数据核验位于 `research/`。城市级地点仅作示意锚点，不代表精确发射台地址。

## API

| 路径 | 说明 |
| --- | --- |
| `GET /api/bootstrap` | 压缩的列式电台目录 |
| `GET /api/stats` | 总数、流派、国家和语言统计 |
| `GET /api/station/:id` | 单个电台详情 |
| `POST /api/click/:id` | 尽力上报收听点击 |
| `GET /api/stream/:id` | 普通音频流与 HLS 播放列表中继 |
| `GET /api/stream-seg?u=…` | HLS 段与子播放列表中继（HTTPS 公网访问用） |
| `GET /api/health` | 健康检查 |

`/api/stream/:id` 不接受任意 URL，只转发数据库内已有的流。两个流端点都会校验目标解析到公网地址、拒绝携带凭证的 URL，并在每次重定向后重新校验。

## 测试与构建

```bash
npm test
npm run build
```

测试覆盖音频包络、锁定计时、流地址转发约束和 HLS 地址处理。构建产物位于 `web/dist`。

## 目录

```text
server/                 API、SQLite、目录抓取与流代理
web/                    React + Three.js 前端
data/                   首次启动使用的电台目录快照
deploy/fnos/roamdial/   fnOS 应用工程
deploy/entrypoint.sh    容器初始化入口
compose.yaml            本地 Docker Compose
Dockerfile              多阶段生产镜像
scripts/                发布构建脚本
tools/                  一次性数据工具（Radio Garden 城市锚点）
research/               Radio Garden 与 GeoNames 数据核验
```

## 数据来源与许可

- 电台目录：[Radio Browser](https://www.radio-browser.info/)
- 陆地底图：[Natural Earth](https://www.naturalearthdata.com/)，公共领域
- 城市锚点：[GeoNames cities15000](https://download.geonames.org/export/dump/)，CC BY 4.0；城市坐标导自 [Radio Garden](https://radio.garden/)
- HLS 播放：[hls.js](https://github.com/video-dev/hls.js)

各数据源的授权和精度说明见 `web/public/data/ATTRIBUTION.txt` 与 `research/`。

## 已知限制

- 上游电台可能停播、更换地址或限制跨域访问，不能保证所有电台长期可播。
- 没有精确坐标的电台使用国家或城市锚点作示意散布，不应解释为真实发射位置。
- HTTPS 公网访问下 HLS 流量经服务端中转（这是绕过混合内容拦截的唯一办法）；局域网 HTTP 访问下 HLS 为直连，不占用服务端带宽。
- 目录刷新依赖 Radio Browser 公开服务，失败时保留本地快照。
