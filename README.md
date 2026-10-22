# RoamDial

**English** | [中文](README_zh.md) | [日本語](README_ja.md) | [한국어](README_ko.md)

> **About this project**: This is an independent, unofficial clone of [roamdial.com](https://roamdial.com/), created for learning and research purposes only. It is not affiliated with the original site or its operators in any way.

---

RoamDial is an interactive web app that organizes radio stations worldwide into a 3D genre nebula and a dot-matrix globe. Pick a point of light and listen; the same set of particles morphs between the globe and the nebula.

The frontend uses React, Three.js and Vite; the backend uses Node.js, Express and SQLite. A station-directory snapshot ships with the repository, so first launch does not depend on any upstream directory service.

## Features

- Two views — genre nebula and globe — with particles morphed continuously by station ID.
- On first entry particles settle onto the globe; respects the OS "reduce motion" preference.
- Drag, zoom, reticle hold-to-lock, and audio-driven brightness feedback.
- Playback of plain MP3/AAC streams and HLS stations, with pause, mute, favorites, search and share.
- HLS works over HTTPS (e.g. fnOS FN Connect public access): playlists are rewritten server-side and relayed same-origin, so browser mixed-content blocking never applies.
- The stream proxy validates public targets and redirects; HLS players load on demand in the browser.
- Docker and fnOS `.fpk` deployment, with persisted SQLite data.

## Run locally

Requires Node.js 22 or newer.

```bash
npm run install:all
npm run build
npm start
```

Open <http://localhost:8620>. On first launch, if the data directory is empty the server seeds the station directory from `data/stations.json.gz`.

For development, use two terminals:

```bash
npm run server
npm run dev
```

The Vite dev server runs on <http://localhost:5173> and proxies `/api` to `localhost:8620`.

## Docker

Build and start locally:

```bash
docker compose up -d --build
```

The default address is <http://localhost:8621>. Change the host port with an environment variable:

```bash
ROAMDIAL_PORT=9000 docker compose up -d
```

Compose uses the named volume `roamdial_data` for `roamdial.db`. Recreating the container never overwrites the station directory or refresh records.

To use a prebuilt image from a Release, import the archive for your architecture first, then start with the published `roamdial-docker-compose.yaml`:

```bash
gunzip -c roamdial-app-linux-arm64.tar.gz | docker load
docker compose -f roamdial-docker-compose.yaml up -d
```

Replace `arm64` with `amd64` on AMD64 devices.

Without Compose:

```bash
docker run -d \
  --name roamdial \
  --restart unless-stopped \
  -p 8621:8620 \
  -v roamdial_data:/data \
  roamdial-app:0.0.1
```

Health check:

```bash
curl http://localhost:8621/api/health
```

## fnOS

`deploy/fnos/roamdial` is the fnOS app project, packaged into a `.fpk` with `fnpack 1.2.3`. The package uses the fixed port `8621` and declares the `roamdial/data` persistent share.

The Releases page provides packages for both architectures. The image ships inside the package — no public registry pull is needed after install.

```text
roamdial-fnos-x86.fpk
roamdial-fnos-arm.fpk
```

After installing, open RoamDial from the fnOS App Center, or visit:

```text
http://<fnOS-IP>:8621
```

If port 8621 is taken, stop the conflicting service first. The fnOS lifecycle scripts import the local image for your architecture and start the Compose project. Public access through FN Connect (HTTPS) plays every station, HLS included.

### Rebuilding release artifacts

With the official `fnpack 1.2.3` installed, run:

```bash
scripts/build-release.sh
```

The script builds `linux/amd64` and `linux/arm64` images, exports Docker archives, generates both FPKs, and writes a SHA-256 checksum file. The manifest version always follows `package.json`. Artifacts land in `artifacts/`.

Verify all artifacts before publishing:

```bash
cd artifacts
shasum -a 256 -c SHA256SUMS
```

## Configuration

The backend reads these environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8620` | Port listened on inside the container |
| `RD_DB` | `server/roamdial.db` | SQLite database path; `/data/roamdial.db` inside the container |

Use Compose's `ROAMDIAL_PORT` to change the host port; do not change the in-container `PORT`.

## Data and refresh

`data/stations.json.gz` in the repository is a Radio Browser directory snapshot, imported only when the database is empty at startup. A running service attempts a weekly refresh of popular and trending stations; a failed refresh never stops the existing directory from working.

To re-run a full directory crawl:

```bash
npm run ingest
```

City anchors are generated from Radio Garden's public places API by `tools/import-radio-garden.py` (one-off, Python 3, no dependencies) into `web/src/assets/city-anchors.json`; it matches stations to real cities by country and state. Research on Radio Garden and GeoNames data lives in `research/`. City-level places are illustrative anchors, not exact transmitter addresses.

## API

| Path | Description |
| --- | --- |
| `GET /api/bootstrap` | Gzipped columnar station directory |
| `GET /api/stats` | Totals for genres, countries and languages |
| `GET /api/station/:id` | Single station details |
| `POST /api/click/:id` | Best-effort listen-click reporting |
| `GET /api/stream/:id` | Relay for plain audio streams and HLS playlists |
| `GET /api/stream-seg?u=…` | Relay for HLS segments and sub-playlists (HTTPS public access) |
| `GET /api/health` | Health check |

`/api/stream/:id` accepts no arbitrary URL — it only relays streams already in the database. Both stream endpoints validate that every target resolves to a public address, reject credentials, and re-validate on every redirect.

## Tests and build

```bash
npm test
npm run build
```

Tests cover the audio envelope, lock timing, stream-forwarding constraints and HLS URL handling. Build output goes to `web/dist`.

## Layout

```text
server/                 API, SQLite, directory crawl and stream proxy
web/                    React + Three.js frontend
data/                   Station directory snapshot used on first launch
deploy/fnos/roamdial/   fnOS app project
deploy/entrypoint.sh    Container initialization entrypoint
compose.yaml            Local Docker Compose
Dockerfile              Multi-stage production image
scripts/                Release build scripts
tools/                  One-off data tools (Radio Garden city anchors)
research/               Radio Garden and GeoNames data verification
```

## Data sources and licensing

- Station directory: [Radio Browser](https://www.radio-browser.info/)
- Land outlines: [Natural Earth](https://www.naturalearthdata.com/), public domain
- City anchors: [GeoNames cities15000](https://download.geonames.org/export/dump/), CC BY 4.0; city coordinates imported from [Radio Garden](https://radio.garden/)
- HLS playback: [hls.js](https://github.com/video-dev/hls.js)

Licensing and accuracy notes for each source are in `web/public/data/ATTRIBUTION.txt` and `research/`.

## Known limitations

- Upstream stations may go offline, change URLs or restrict cross-origin access; long-term playability is not guaranteed.
- Stations without exact coordinates are scattered around country or city anchors for illustration only — not real transmitter locations.
- Over HTTPS public access, HLS traffic is relayed through the server (the only way around mixed-content blocking); LAN HTTP access loads HLS directly.
- Directory refresh depends on the public Radio Browser service; on failure the bundled snapshot remains in use.
