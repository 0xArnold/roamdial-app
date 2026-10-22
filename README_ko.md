# RoamDial

[English](README.md) | [中文](README_zh.md) | [日本語](README_ja.md) | **한국어**

> **프로젝트 성격**: 이 프로젝트는 [roamdial.com](https://roamdial.com/)의 독립적인 비공식 클론으로, 학습 및 연구 목적으로만 제작되었습니다. 원본 사이트 또는 그 운영자와 어떤 관련도 없습니다.

---

RoamDial은 전 세계 라디오 방송국을 3D 장르 성운과 도트 매트릭스 지구로 조직화한 인터랙티브 웹 애플리케이션입니다. 빛나는 점을 선택하면 청취할 수 있으며, 지구와 성운 사이에서는 동일한 입자 집합이 연속적으로 변형됩니다.

프론트엔드는 React, Three.js, Vite를 사용하고 백엔드는 Node.js, Express, SQLite를 사용합니다. 방송국 디렉터리 스냅샷이 저장소에 포함되어 있어 첫 실행 시 외부 디렉터리 서비스에 의존하지 않습니다.

## 기능

- 장르 성운과 지구의 두 가지 뷰. 방송국 ID 단위로 입자가 연속적으로 모핑됩니다.
- 첫 진입 시 입자가 지구에 안착. OS의 "동작 줄이기" 설정을 지원합니다.
- 드래그, 줌, 조준선 유지 잠금, 오디오 연동 밝기 피드백.
- 일반 MP3/AAC 스트림 및 HLS 방송국 재생. 일시정지, 음소거, 즐겨찾기, 검색, 공유 지원.
- HLS는 HTTPS 환경(fnOS FN Connect 공개 접속 등)에서도 재생됩니다. 플레이리스트가 서버에서 재작성되어 동일 출처 릴레이로 제공되므로 브라우저의 혼합 콘텐츠 차단 영향을 받지 않습니다.
- 스트림 프록시가 공개 주소와 리디렉션을 검증합니다. HLS 플레이어는 브라우저에서 필요 시 로드됩니다.
- Docker 및 fnOS `.fpk` 두 가지 배포 방식. SQLite 데이터는 영속됩니다.

## 로컬 실행

Node.js 22 이상이 필요합니다.

```bash
npm run install:all
npm run build
npm start
```

<http://localhost:8620>을 엽니다. 첫 실행 시 데이터 디렉터리가 비어 있으면 `data/stations.json.gz`에서 방송국 디렉터리가 자동 초기화됩니다.

개발 모드는 두 개의 터미널을 사용합니다:

```bash
npm run server
npm run dev
```

Vite 개발 서버는 <http://localhost:5173>에서 동작하며 `/api`를 `localhost:8620`으로 프록시합니다.

## Docker

로컬에서 빌드하여 실행:

```bash
docker compose up -d --build
```

기본 접속 주소는 <http://localhost:8621>입니다. 환경 변수로 호스트 포트를 변경할 수 있습니다:

```bash
ROAMDIAL_PORT=9000 docker compose up -d
```

Compose는 이름 있는 볼륨 `roamdial_data`에 `roamdial.db`를 저장합니다. 컨테이너를 다시 만들어도 방송국 디렉터리와 갱신 기록은 덮어쓰지 않습니다.

Release의 사전 빌드 이미지를 사용할 때는 해당 아키텍처의 아카이브를 먼저 불러온 뒤, 제공되는 `roamdial-docker-compose.yaml`으로 실행합니다:

```bash
gunzip -c roamdial-app-linux-arm64.tar.gz | docker load
docker compose -f roamdial-docker-compose.yaml up -d
```

AMD64 기기에서는 `arm64`를 `amd64`로 바꾸세요.

Compose를 사용하지 않는 경우:

```bash
docker run -d \
  --name roamdial \
  --restart unless-stopped \
  -p 8621:8620 \
  -v roamdial_data:/data \
  roamdial-app:0.0.1
```

헬스 체크:

```bash
curl http://localhost:8621/api/health
```

## fnOS

`deploy/fnos/roamdial`은 fnOS 앱 프로젝트이며, `fnpack 1.2.3`으로 `.fpk`를 생성합니다. 패키지는 고정 포트 `8621`을 사용하고 `roamdial/data` 영속 공유 디렉터리를 선언합니다.

Release 페이지에 두 가지 아키텍처의 패키지가 있습니다. 이미지는 패키지에 포함되어 있어 설치 후 공개 레지스트리에서 내려받을 필요가 없습니다.

```text
roamdial-fnos-x86.fpk
roamdial-fnos-arm.fpk
```

설치 후 fnOS 앱 센터에서 RoamDial을 열거나 다음 주소로 접속합니다:

```text
http://<fnOS-IP>:8621
```

8621 포트가 사용 중이라면 먼저 해당 서비스를 중지하세요. fnOS 라이프사이클 스크립트가 해당 아키텍처의 로컬 이미지를 불러오고 Compose 프로젝트를 시작합니다. FN Connect 공개 접속(HTTPS)에서는 HLS를 포함한 모든 방송국이 재생됩니다.

### 릴리스 산출물 재생성

공식 `fnpack 1.2.3`을 설치한 뒤 실행합니다:

```bash
scripts/build-release.sh
```

이 스크립트는 `linux/amd64`와 `linux/arm64` 이미지를 빌드하고, Docker 아카이브를 내보내고, 두 종류의 FPK를 생성하며, SHA-256 체크섬 파일을 작성합니다. manifest의 버전은 항상 `package.json`을 따릅니다. 산출물은 `artifacts/`에 생성됩니다.

공개 전 모든 산출물을 검증하려면:

```bash
cd artifacts
shasum -a 256 -c SHA256SUMS
```

## 설정

백엔드는 다음 환경 변수를 읽습니다:

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` | `8620` | 컨테이너 내부 수신 포트 |
| `RD_DB` | `server/roamdial.db` | SQLite 데이터베이스 경로. 컨테이너 내부에서는 `/data/roamdial.db` |

호스트 포트 변경은 Compose의 `ROAMDIAL_PORT`를 사용하고, 컨테이너 내부 `PORT`는 변경하지 마세요.

## 데이터와 갱신

저장소의 `data/stations.json.gz`는 Radio Browser 디렉터리 스냅샷이며, 시작 시 데이터베이스가 비어 있을 때만 불러옵니다. 실행 중인 서비스는 인기 및 급상승 방송국을 매주 갱신하려고 하며, 갱신에 실패해도 기존 디렉터리는 계속 사용됩니다.

디렉터리 전체를 다시 수집하려면:

```bash
npm run ingest
```

도시 앵커는 `tools/import-radio-garden.py`(일회성 스크립트, Python 3, 서드파티 의존성 없음)가 Radio Garden의 공개 places API에서 생성하여 `web/src/assets/city-anchors.json`에 기록합니다. 국가와 주/도별로 방송국을 실제 도시에 매칭합니다. Radio Garden과 GeoNames 데이터 검증은 `research/`에 있습니다. 도시 수준의 위치는 참고용 앵커일 뿐 정확한 송신소 주소는 아닙니다.

## API

| 경로 | 설명 |
| --- | --- |
| `GET /api/bootstrap` | gzip 압축된 열 형태 방송국 디렉터리 |
| `GET /api/stats` | 장르, 국가, 언어 집계 |
| `GET /api/station/:id` | 단일 방송국 상세 |
| `POST /api/click/:id` | 최선-effort 청취 클릭 보고 |
| `GET /api/stream/:id` | 일반 오디오 스트림 및 HLS 플레이리스트 릴레이 |
| `GET /api/stream-seg?u=…` | HLS 세그먼트 및 하위 플레이리스트 릴레이(HTTPS 공개 접속용) |
| `GET /api/health` | 헬스 체크 |

`/api/stream/:id`는 임의의 URL을 받지 않으며 데이터베이스에 있는 기존 스트림만 릴레이합니다. 두 스트림 엔드포인트 모두 대상이 공개 주소로 해석되는지, 인증 정보가 없는지 검증하고 리디렉션마다 재검증합니다.

## 테스트와 빌드

```bash
npm test
npm run build
```

테스트는 오디오 엔벨로프, 잠금 타이밍, 스트림 전달 제약, HLS URL 처리를 다룹니다. 빌드 산출물은 `web/dist`에 생성됩니다.

## 디렉터리 구성

```text
server/                 API, SQLite, 디렉터리 수집과 스트림 프록시
web/                    React + Three.js 프론트엔드
data/                   첫 실행에 사용하는 방송국 디렉터리 스냅샷
deploy/fnos/roamdial/   fnOS 앱 프로젝트
deploy/entrypoint.sh    컨테이너 초기화 엔트리포인트
compose.yaml            로컬 Docker Compose
Dockerfile              다단계 프로덕션 이미지
scripts/                릴리스 빌드 스크립트
tools/                  일회성 데이터 도구(Radio Garden 도시 앵커)
research/               Radio Garden과 GeoNames 데이터 검증
```

## 데이터 출처와 라이선스

- 방송국 디렉터리: [Radio Browser](https://www.radio-browser.info/)
- 육지 윤곽: [Natural Earth](https://www.naturalearthdata.com/), 퍼블릭 도메인
- 도시 앵커: [GeoNames cities15000](https://download.geonames.org/export/dump/), CC BY 4.0. 도시 좌표는 [Radio Garden](https://radio.garden/)에서 가져옴
- HLS 재생: [hls.js](https://github.com/video-dev/hls.js)

각 데이터 출처의 라이선스와 정확도 관련 내용은 `web/public/data/ATTRIBUTION.txt`와 `research/`에 있습니다.

## 알려진 제한

- 상위 방송국이 중단되거나 URL이 바뀌거나 교차 출처 접근을 제한할 수 있어 장기적인 재생 가능성은 보장하지 않습니다.
- 정확한 좌표가 없는 방송국은 국가 또는 도시 앵커 주변에 참고용으로 흩뜨려 표시합니다. 실제 송신소 위치가 아닙니다.
- HTTPS 공개 접속에서는 HLS 트래픽이 서버를 경유하여 릴레이됩니다(혼합 콘텐츠 차단을 피하는 유일한 방법). LAN의 HTTP 접속에서는 HLS를 직접 불러오므로 서버 대역폭을 사용하지 않습니다.
- 디렉터리 갱신은 Radio Browser의 공개 서비스에 의존하며, 실패 시 번들 스냅샷이 계속 사용됩니다.
