---
title: "Build & Run (Docker)"
sidebar:
  label: "Docker"
  order: 1
---
Docker で VideoReview を動かす手順です

イメージはリリースごとに ghcr.io で公開しているので、自分で build する必要はありません  
Docker Hub にも同じイメージ（[aritayuto/videoreview](https://hub.docker.com/r/aritayuto/videoreview)、[aritayuto/video-processing](https://hub.docker.com/r/aritayuto/video-processing)）を置いています

※ Docker Compose 2.24 以降が必要です（`docker compose version` で確認できます）

---

## 1. compose.prod.yml で起動

```bash
mkdir video-review
cd video-review
curl -L -O https://raw.githubusercontent.com/arita-yuto/video-review/main/compose.prod.yml
docker compose -f compose.prod.yml up -d
```

`http://localhost:3489` を開くと、最初の管理者を登録する画面が出ます（[管理画面ガイド](/video-review/ja/admin/)）

### Docker Hub から pull する場合

`compose.dockerhub.yml` を `compose.prod.yml` という名前で保存します  
以後の更新も Docker Hub から pull されます

```bash
curl -L -o compose.prod.yml https://github.com/arita-yuto/video-review/releases/latest/download/compose.dockerhub.yml
```

---

## 2. 新しいリリースに更新

```bash
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

---

## 3. .env の設定

保存先やバージョンを変えたいときは、`compose.prod.yml` と同じフォルダに `.env` を置きます

| 変数 | 内容 |
|---|---|
| `DOCKER_HOST_STORAGE` | アップロードしたファイルを置くホスト側のパス（空なら Docker の named volume に保存） |
| `VIDEO_REVIEW_VERSION` | 使うリリース、例 `v0.2.0`（空なら最新） |

---

## 参考
### video-review-cli で更新

`compose.prod.yml` と同じフォルダに `video-review-cli` を置くと、更新がコマンド 1 つで済みます

```bash
# Linux
curl -L -o video-review-cli https://github.com/arita-yuto/video-review/releases/latest/download/video-review-cli-linux-amd64
chmod +x video-review-cli

# Windows
curl.exe -L -o video-review-cli.exe https://github.com/arita-yuto/video-review/releases/latest/download/video-review-cli-windows-amd64.exe

# 更新
./video-review-cli upgrade --docker
```

起動と停止は `./video-review-cli start --docker`、`./video-review-cli stop --docker` です

### ソースから build

公開イメージの代わりに手元で build するときは、compose が参照する名前で tag を付けます

```bash
docker build -t ghcr.io/arita-yuto/video-review/videoreview:latest -f docker/web/Dockerfile.prod .
docker build -t ghcr.io/arita-yuto/video-review/video-processing:latest -f docker/video-processing/Dockerfile .
```

### 開発用（Docker）

```bash
npm install
docker compose up -d --build
```
