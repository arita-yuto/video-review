# 🐳 Build & Run Guide (Docker)

VideoReview を Docker で動かす手順です  
本番やコンテナでの運用にはこちらを使います

イメージは GitHub のリリースごとに ghcr.io に公開されているので、build は要りません

※ Docker Compose 2.24 以降が必要です（`docker compose version` で確認できます）

---

## 1. 起動する

```bash
git clone --depth 1 https://github.com/arita-yuto/video-review.git
cd video-review
docker compose -f compose.prod.yml up -d
```

`http://localhost:3489` を開くと、最初の管理者を登録する画面が出ます（[管理画面ガイド](../admin/README.jp.md)）

---

## 2. 更新する

```bash
git pull
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

---

## 3. 保存先や版を固定する

必要なときだけ、リポジトリの直下に `.env` を作ります

| 変数 | 内容 |
|---|---|
| `DOCKER_HOST_STORAGE` | アップロードされたファイルを置くホスト側のパス（空なら Docker の named volume に保存） |
| `VIDEO_REVIEW_VERSION` | 動かすリリース、例 `v0.2.0`（空なら最新のリリースを取得） |

---

## Reference
### ソースから build する

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
