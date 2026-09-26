# 🐳 Build & Run Guide (Docker)

VideoReview を Docker で動かす手順です  
本番やコンテナでの運用にはこちらを使います

イメージは GitHub のリリースごとに ghcr.io に公開されているので、build は要りません

---

## 1. `.env` を作る

```bash
cp .example.env .env
```

Docker に関わる項目は 2 つです

| 変数 | 内容 |
|---|---|
| `DOCKER_HOST_STORAGE` | アップロードされたファイルを置くホスト側のパス（空なら Docker の named volume に保存） |
| `VIDEO_REVIEW_VERSION` | 動かすリリース、例 `v0.2.0`（空なら最新のリリースを取得） |

---

## 2. 起動する

```bash
# 1. 公開イメージを取得
docker compose -f compose.prod.yml pull

# 2. DB を起動
docker compose -f compose.prod.yml up -d db

# 3. DB を構築（初回と、schema が更新されたとき）
docker compose -f compose.prod.yml run --rm videoreview npm run prisma:deploy

# 4. サービスを起動
docker compose -f compose.prod.yml up -d
```

`http://localhost:3489` を開くと、最初の管理者を登録する画面が出ます（[管理画面ガイド](../admin/README.jp.md)）

---

## 3. 更新する

```bash
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml run --rm videoreview npm run prisma:deploy
docker compose -f compose.prod.yml up -d
```

※ `VIDEO_REVIEW_VERSION` で版を固定しているときは、先に `.env` の版を上げます

---

## Reference
### ソースから build する

公開イメージの代わりに手元で build するときは、compose が参照する名前で tag を付けます  
その後の手順は「起動する」の 2 番以降と同じです（`pull` は不要）

```bash
docker build -t ghcr.io/arita-yuto/video-review/videoreview:latest -f docker/web/Dockerfile.prod .
docker build -t ghcr.io/arita-yuto/video-review/video-processing:latest -f docker/video-processing/Dockerfile .
```

### 開発用（Docker）

```bash
npm install
docker compose up -d --build
```
