---
title: "Build & Run Guide (Local / On‑premise)"
sidebar:
  label: "ローカル / オンプレ"
  order: 2
---
VideoReview を Docker を使わずに、サーバーで直接動かす手順です  
リリースごとに公開している zip を、`video-review-cli` で入れて動かします

※ zip は Linux（x64）と Windows（x64）向けです

---

## 1. 必要なソフトウェア

- Node v24
- PostgreSQL
- ffmpeg（動画の変換に使うので、`ffmpeg` コマンドに PATH を通します）

---

## 2. インストール

インストールのフォルダを作り、そのフォルダで進めます

### video-review-cli と .env をダウンロード

```bash
# Linux
curl -L -o video-review-cli https://github.com/arita-yuto/video-review/releases/latest/download/video-review-cli-linux-amd64
chmod +x video-review-cli

# Windows
curl.exe -L -o video-review-cli.exe https://github.com/arita-yuto/video-review/releases/latest/download/video-review-cli-windows-amd64.exe

# Linux / Windows
curl -L -o .env https://raw.githubusercontent.com/arita-yuto/video-review/main/.example.env
```

### .env の設定

`DATABASE_URL` に PostgreSQL のサーバーを書きます

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/videoreview"
```

本番では `VIDEO_REVIEW_LOCAL_ROOTDIR` に動画の保存先を書きます

```bash
VIDEO_REVIEW_LOCAL_ROOTDIR="/path/.../..."
```

空のときは、インストールのフォルダの `uploads` に保存されます  
アプリと同じ場所に動画が溜まるので、容量の管理が難しくなります

### インストールと起動

```bash
./video-review-cli upgrade
```

最新のリリースを入れて、Web と worker を起動します  
`… is running` と出たら完了です

`http://localhost:3489` を開くと、最初の管理者を登録する画面が出ます（[管理画面ガイド](/video-review/ja/admin/)）

---

## 3. 起動と停止

```bash
./video-review-cli start
./video-review-cli stop
```

Web と worker はバックグラウンドで動き、ログは `logs` に出ます  
OS を再起動したあとは、`start` で起動します

---

## 4. 新しいリリースに更新

```bash
./video-review-cli upgrade
```

最新のリリースを入れて、Web、worker、`video-review-cli` を入れ替えます  
起動しなかったときは、元のリリースに戻します

管理画面からも更新できます（[General](/video-review/ja/admin/general/)）

※ `.env` を書き換えたときは、`./video-review-cli stop` → `start` で読み直します

---

## 参考

### フォルダの中身

| 名前 | 内容 |
|---|---|
| `video-review-cli` | 最新のリリースの CLI |
| `.env` | 設定 |
| `secrets` | 暗号化の鍵（消すと保存した token が読めなくなります） |
| `uploads` | アップロードされたファイル（`VIDEO_REVIEW_LOCAL_ROOTDIR` が空のとき） |
| `releases` | 展開したリリース（動いているものと、新しい 2 つを残します） |
| `current` | 動いているリリース |
| `run` | 動いている Web と worker のプロセス番号 |
| `logs` | `web.log`、`worker.log`、`upgrade.log` |

### 別のフォルダに移動

1. 今のサーバーを止めます
2. 新しいフォルダに `video-review-cli` をダウンロードします（[video-review-cli と .env をダウンロード](#video-review-cli-と-env-をダウンロード)、`.env` は落としません）
3. 今のフォルダから `.env`、`secrets`、`uploads` を、新しいフォルダに移します
4. 新しいフォルダで `./video-review-cli upgrade` を実行します

※ `uploads` は、`VIDEO_REVIEW_LOCAL_ROOTDIR` を設定していなかった場合だけあります

### ソースから build

```bash
cp .example.env .env      # DATABASE_URL を書く
npm install
npm run prisma:deploy
npm run build
npm run start
```
