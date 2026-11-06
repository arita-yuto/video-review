# 🐳 Build & Run Guide (Docker)

VideoReview を Docker で動かす手順です  
本番やコンテナでの運用にはこちらを使います

イメージは GitHub のリリースごとに ghcr.io に公開されているので、build は要りません

※ Docker Compose 2.24 以降が必要です（`docker compose version` で確認できます）

---

## 1. 起動する

```bash
mkdir video-review
cd video-review
curl -L -O https://raw.githubusercontent.com/arita-yuto/video-review/main/compose.prod.yml
docker compose -f compose.prod.yml up -d
```

`http://localhost:3489` を開くと、最初の管理者を登録する画面が出ます（[管理画面ガイド](../admin/README.jp.md)）

---

## 2. 更新する

```bash
curl -L -O https://raw.githubusercontent.com/arita-yuto/video-review/main/compose.prod.yml
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

---

## 3. 保存先や版を固定する

必要なときだけ、`compose.prod.yml` と同じフォルダに `.env` を作ります

| 変数 | 内容 |
|---|---|
| `DOCKER_HOST_STORAGE` | アップロードされたファイルを置くホスト側のパス（空なら Docker の named volume に保存） |
| `VIDEO_REVIEW_VERSION` | 動かすリリース、例 `v0.2.0`（空なら最新のリリースを取得） |

---

## Reference
### video-review-cli でまとめて実行する

`compose.prod.yml` と同じフォルダに `video-review-cli` をダウンロードすると、更新の手順をまとめて実行できます

```bash
# Linux
curl -L -o video-review-cli https://github.com/arita-yuto/video-review/releases/latest/download/video-review-cli-linux-amd64
chmod +x video-review-cli

# Windows
curl.exe -L -o video-review-cli.exe https://github.com/arita-yuto/video-review/releases/latest/download/video-review-cli-windows-amd64.exe

# 更新する
./video-review-cli upgrade --docker
```

起動・終了は `./video-review-cli start --docker` / `stop --docker` です

### GitHub Actions から更新する

サーバーに self-hosted runner を入れておくと、GitHub の画面から更新できます  
次のような workflow を、自分のリポジトリに置きます

```yaml
name: Update VideoReview
on: workflow_dispatch

jobs:
  upgrade:
    runs-on: [self-hosted, videoreview]
    steps:
      - run: ./video-review-cli upgrade --docker
        working-directory: /path/to/video-review
```

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
