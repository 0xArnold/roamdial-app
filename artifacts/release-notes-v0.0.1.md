# RoamDial 0.0.1

**[中文](#中文-1)** | **[English](#english-1)**

> **项目性质**：本项目是 [roamdial.com](https://roamdial.com/) 的独立复刻（unofficial clone），仅用于学习与技术研究，与原站及其运营方无任何关联。
>
> **About this project**: This is an independent, unofficial clone of [roamdial.com](https://roamdial.com/), created for learning and research purposes only. It is not affiliated with the original site or its operators in any way.

---

## 中文

首个公开版本。包含完整电台目录快照、三维点阵地球与流派星云、HLS 播放、Docker 镜像与 fnOS 离线安装包。本项目复刻自 [roamdial.com](https://roamdial.com/)，与其无关联。

### 下载选择

| 设备 | fnOS 安装包 | Docker 镜像 |
| --- | --- | --- |
| Intel / AMD x86 | `roamdial-fnos-x86.fpk` | `roamdial-app-linux-amd64.tar.gz` |
| ARM64 | `roamdial-fnos-arm.fpk` | `roamdial-app-linux-arm64.tar.gz` |

`roamdial-fnos-*.fpk` 已包含对应架构镜像，适合在 fnOS 应用中心手动安装。应用固定使用端口 `8621`，数据保存在 `roamdial/data` 共享目录。

### 使用 Docker Compose

```bash
gunzip -c roamdial-app-linux-arm64.tar.gz | docker load
docker compose -f roamdial-docker-compose.yaml up -d
```

AMD64 设备将文件名中的 `arm64` 替换为 `amd64`。启动后访问 `http://<设备IP>:8621`，健康检查为 `/api/health`。

### 校验

下载全部产物后，在文件所在目录执行：

```bash
shasum -a 256 -c SHA256SUMS
```

Linux 环境可使用 `sha256sum -c SHA256SUMS`。

### 已知限制

- 上游电台可能停播、更换地址或限制跨域访问。
- 缺少精确坐标的电台使用城市级示意位置。
- 目录刷新依赖 Radio Browser；刷新失败时继续使用内置快照。

---

## English

First public release. Ships with a full station-directory snapshot, a 3D dot-matrix globe and genre nebula, HLS playback, a Docker image and an offline fnOS package. This project is an unofficial clone of [roamdial.com](https://roamdial.com/) and is not affiliated with it.

### Download

| Device | fnOS package | Docker image |
| --- | --- | --- |
| Intel / AMD x86 | `roamdial-fnos-x86.fpk` | `roamdial-app-linux-amd64.tar.gz` |
| ARM64 | `roamdial-fnos-arm.fpk` | `roamdial-app-linux-arm64.tar.gz` |

`roamdial-fnos-*.fpk` bundles the image for its architecture and is meant for manual install from the fnOS App Center. The app always uses port `8621`; data lives in the `roamdial/data` share.

### Docker Compose

```bash
gunzip -c roamdial-app-linux-arm64.tar.gz | docker load
docker compose -f roamdial-docker-compose.yaml up -d
```

Replace `arm64` with `amd64` in the filename on AMD64 devices. After startup visit `http://<device-IP>:8621`; the health endpoint is `/api/health`.

### Verify

After downloading all artifacts, run in their directory:

```bash
shasum -a 256 -c SHA256SUMS
```

On Linux you can use `sha256sum -c SHA256SUMS`.

### Known limitations

- Upstream stations may go offline, change URLs or restrict cross-origin access.
- Stations without exact coordinates use city-level illustrative positions.
- Directory refresh depends on Radio Browser; on failure the bundled snapshot remains in use.
