# RoamDial

[English](README.md) | [中文](README_zh.md) | **日本語** | [한국어](README_ko.md)

> **このプロジェクトについて**: これは [roamdial.com](https://roamdial.com/) の独立した非公式クローンで、学習および研究のみを目的としています。元のサイトまたはその運営者とは一切関係がありません。

---

RoamDial は世界中のラジオ局を 3D のジャンル星雲とドットマトリックスの地球に組織化するインタラクティブな Web アプリケーションです。光の点を選ぶと視聴でき、地球と星雲の間では同一の粒子セットが連続的に変形します。

フロントエンドは React・Three.js・Vite、バックエンドは Node.js・Express・SQLite を使用しています。ラジオ局ディレクトリのスナップショットがリポジトリに含まれているため、初回起動時に外部ディレクトリサービスを必要としません。

## 機能

- ジャンル星雲と地球の 2 つのビュー。局 ID 単位で粒子が連続的にモーフィングします。
- 初回アクセス時は粒子が地球に着地。OS の「動きを減らす」設定に対応。
- ドラッグ、ズーム、照準ストックによるロック、オーディオ連動の明るさフィードバック。
- 通常の MP3/AAC ストリームと HLS 局の再生。一時停止、ミュート、お気に入り、検索、共有に対応。
- HLS は HTTPS 環境（fnOS FN Connect の公開アクセス等）でも再生可能。プレイリストはサーバー側で書き換えて同一オリジンの中継経由で配信されるため、ブラウザの混合コンテンツブロックの影響を受けません。
- ストリームプロキシは公開アドレスとリダイレクトを検証。HLS プレイヤーはブラウザ側で必要に応じて読み込まれます。
- Docker と fnOS `.fpk` の 2 つのデプロイ方式。SQLite データは永続化されます。

## ローカルで実行

Node.js 22 以上が必要です。

```bash
npm run install:all
npm run build
npm start
```

<http://localhost:8620> を開きます。初回起動時にデータディレクトリが空であれば、`data/stations.json.gz` から局ディレクトリが自動的に初期化されます。

開発モードは 2 つのターミナルを使用します：

```bash
npm run server
npm run dev
```

Vite 開発サーバーは <http://localhost:5173> で動作し、`/api` を `localhost:8620` にプロキシします。

## Docker

ローカルでビルドして起動：

```bash
docker compose up -d --build
```

デフォルトのアクセス先は <http://localhost:8621> です。環境変数でホスト側ポートを変更できます：

```bash
ROAMDIAL_PORT=9000 docker compose up -d
```

Compose は名前付きボリューム `roamdial_data` に `roamdial.db` を保存します。コンテナを再作成しても局ディレクトリや更新記録は上書きされません。

Release の事前ビルドイメージを使う場合は、対応アーキテクチャのアーカイブを読み込んでから、公開されている `roamdial-docker-compose.yaml` で起動します：

```bash
gunzip -c roamdial-app-linux-arm64.tar.gz | docker load
docker compose -f roamdial-docker-compose.yaml up -d
```

AMD64 機器では `arm64` を `amd64` に置き換えてください。

Compose を使わない場合：

```bash
docker run -d \
  --name roamdial \
  --restart unless-stopped \
  -p 8621:8620 \
  -v roamdial_data:/data \
  roamdial-app:0.0.1
```

ヘルスチェック：

```bash
curl http://localhost:8621/api/health
```

## fnOS

`deploy/fnos/roamdial` は fnOS アプリプロジェクトで、`fnpack 1.2.3` を使って `.fpk` にパッケージングされます。パッケージは固定ポート `8621` を使用し、`roamdial/data` 永続共有ディレクトリを宣言します。

Release ページには 2 つのアーキテクチャのパッケージがあります。イメージはパッケージに同梱されているため、インストール後に公衆レジストリから取得する必要はありません。

```text
roamdial-fnos-x86.fpk
roamdial-fnos-arm.fpk
```

インストール後は fnOS アプリセンターから RoamDial を開くか、以下にアクセスします：

```text
http://<fnOS-IP>:8621
```

ポート 8621 が使用中の場合は、先に競合するサービスを停止してください。fnOS のライフサイクルスクリプトが対応アーキテクチャのローカルイメージを読み込み、Compose プロジェクトを起動します。FN Connect による公開アクセス（HTTPS）では、HLS を含むすべての局が再生できます。

### リリース成果物の再生成

公式の `fnpack 1.2.3` をインストールした上で実行します：

```bash
scripts/build-release.sh
```

このスクリプトは `linux/amd64` と `linux/arm64` イメージをビルドし、Docker アーカイブを書き出し、2 種類の FPK を生成して、SHA-256 チェックサムファイルを作成します。manifest のバージョンは常に `package.json` に従います。成果物は `artifacts/` に出力されます。

公開前に全成果物を検証する場合：

```bash
cd artifacts
shasum -a 256 -c SHA256SUMS
```

## 設定

バックエンドは以下の環境変数を読み取ります：

| 変数 | デフォルト | 説明 |
| --- | --- | --- |
| `PORT` | `8620` | コンテナ内の待ち受けポート |
| `RD_DB` | `server/roamdial.db` | SQLite データベースのパス。コンテナ内では `/data/roamdial.db` |

ホスト側ポートの変更は Compose の `ROAMDIAL_PORT` を使用し、コンテナ内の `PORT` は変更しないでください。

## データと更新

リポジトリ内の `data/stations.json.gz` は Radio Browser ディレクトリのスナップショットで、起動時にデータベースが空の場合のみ読み込まれます。稼働中のサービスは人気・急上昇の局を毎週更新しようとしますが、更新に失敗しても既存のディレクトリは使われ続けます。

ディレクトリの全量再取得を実行する場合：

```bash
npm run ingest
```

都市アンカーは `tools/import-radio-garden.py`（一度だけ実行するスクリプト、Python 3、依存ライブラリなし）が Radio Garden の公開 places API から生成し、`web/src/assets/city-anchors.json` に書き出します。国と州/県に基づいて局を実際の都市にマッチングします。Radio Garden と GeoNames のデータ検証は `research/` にあります。都市レベルの地点は目安となるアンカーであり、正確な送信所住所ではありません。

## API

| パス | 説明 |
| --- | --- |
| `GET /api/bootstrap` | gzip 圧縮された列形式の局ディレクトリ |
| `GET /api/stats` | ジャンル・国・言語の集計 |
| `GET /api/station/:id` | 単一局の詳細 |
| `POST /api/click/:id` | ベストエフォートの視聴クリック報告 |
| `GET /api/stream/:id` | 通常音声ストリームと HLS プレイリストの中継 |
| `GET /api/stream-seg?u=…` | HLS セグメントとサブプレイリストの中継（HTTPS 公開アクセス用） |
| `GET /api/health` | ヘルスチェック |

`/api/stream/:id` は任意の URL を受け付けず、データベース内の既存ストリームのみを中継します。両方のストリーム端点は、対象が公開アドレスに解決すること、認証情報を含まないことを検証し、リダイレクトごとに再検証します。

## テストとビルド

```bash
npm test
npm run build
```

テストはオーディオエンベロープ、ロック timing、ストリーム転送の制約、HLS URL の処理をカバーします。ビルド成果物は `web/dist` に出力されます。

## ディレクトリ構成

```text
server/                 API、SQLite、ディレクトリ取得とストリームプロキシ
web/                    React + Three.js フロントエンド
data/                   初回起動時に使う局ディレクトリのスナップショット
deploy/fnos/roamdial/   fnOS アプリプロジェクト
deploy/entrypoint.sh    コンテナ初期化エントリポイント
compose.yaml            ローカル Docker Compose
Dockerfile              多段ビルドの本番イメージ
scripts/                リリースビルドスクリプト
tools/                  一度だけ実行するデータツール（Radio Garden 都市アンカー）
research/               Radio Garden と GeoNames のデータ検証
```

## データソースとライセンス

- 局ディレクトリ：[Radio Browser](https://www.radio-browser.info/)
- 陸地輪郭：[Natural Earth](https://www.naturalearthdata.com/)、パブリックドメイン
- 都市アンカー：[GeoNames cities15000](https://download.geonames.org/export/dump/)、CC BY 4.0。都市座標は [Radio Garden](https://radio.garden/) から import
- HLS 再生：[hls.js](https://github.com/video-dev/hls.js)

各データソースのライセンスと精度に関する注意は `web/public/data/ATTRIBUTION.txt` と `research/` にあります。

## 既知の制限

- 上流の局が停波、URL 変更、クロスオリジン制限を行う可能性があり、長期の再生可能性は保証できません。
- 正確な座標を持たない局は国または都市アンカー周辺に示唆的に散布されます。実際の送信所位置ではありません。
- HTTPS 公開アクセスでは HLS トラフィックがサーバーを経由して中継されます（混合コンテンツブロックを回避する唯一の方法）。LAN の HTTP アクセスでは HLS は直接読み込みされ、サーバー帯域は使いません。
- ディレクトリ更新は Radio Browser の公開サービスに依存します。失敗時は同梱スナップショットが使われます。
