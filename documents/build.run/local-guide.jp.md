# 💻 Build & Run Guide (Local / On‑premise)

VideoReview を Docker を使わずに、サーバーで直接動かす手順です  
リリースごとに公開している zip を、`video-review-cli` で入れて動かします

※ zip は Linux（x64）と Windows（x64）向けです

---

## 1. 用意する

- Node v24
- PostgreSQL
- ffmpeg（動画の変換に使うので、`ffmpeg` コマンドに PATH を通します）

---

## 2. インストールする

インストールのフォルダを作り、そのフォルダで進めます

### video-review-cli と .env をダウンロードする

```bash
# Linux
curl -L -o video-review-cli https://github.com/arita-yuto/video-review/releases/latest/download/video-review-cli-linux-amd64
chmod +x video-review-cli

# Windows
curl.exe -L -o video-review-cli.exe https://github.com/arita-yuto/video-review/releases/latest/download/video-review-cli-windows-amd64.exe

# Linux / Windows
curl -L -o .env https://raw.githubusercontent.com/arita-yuto/video-review/main/.example.env
```

### .env を書き換える

PostgreSQLが稼働しているサーバーを指定してください

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/videoreview"
```

本番環境では、動画保存用のストレージを 必ず明示的に設定してください

```bash
VIDEO_REVIEW_LOCAL_ROOTDIR="/path/.../..."
```

`VIDEO_REVIEW_LOCAL_ROOTDIR` が未設定、または無効な場合、  
アプリケーションは `process.cwd()/uploads` にフォールバックして
動画ファイルを保存します。

このフォールバック挙動は以下の理由から、長期保存や本番運用には適していません。

- アプリケーションの更新や再デプロイ時にファイルが失われる可能性がある
- ストレージの場所が不明確になる場合がある
- アプリ実行場所と同居してしまうため、容量管理が難しくなる

### インストールして起動する

```bash
./video-review-cli upgrade
```

最新のリリースを入れて、Web と worker を起動します  
`… is running` と出たら完了です

`http://localhost:3489` を開くと、最初の管理者を登録する画面が出ます（[管理画面ガイド](../admin/README.jp.md)）

---

## 3. 起動・終了する

```bash
./video-review-cli start
./video-review-cli stop
```

Web と worker はバックグラウンドで動き、ログは `logs` に出ます  
OS を再起動したあとは、`start` で起動します

---

## 4. 更新する

```bash
./video-review-cli upgrade
```

最新のリリースを入れて、Web、worker、`video-review-cli` を入れ替えます  
起動しなかったときは、元のリリースに戻します

管理画面からも更新できます（[General](../admin/general.jp.md)）

### GitHub Actions から更新する

[Docker ガイド](./docker-guide.jp.md#github-actions-から更新する) の workflow で、`run` を `./video-review-cli upgrade` に、`working-directory` をインストールのフォルダにします  
job が終わったときに runner が Web と worker を止めないよう、job の `env` に `RUNNER_TRACKING_ID: ""` も書きます

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

### VideoReview を別のフォルダへ移す

1. 今のサーバーを止めます
2. 新しいフォルダに `video-review-cli` をダウンロードします（[ダウンロードする](#video-review-cli-と-env-をダウンロードする)、`.env` は落としません）
3. 今のフォルダから `.env`、`secrets`、`uploads` を、新しいフォルダに移します
4. 新しいフォルダで `./video-review-cli upgrade` を実行します

※ `uploads` は、`VIDEO_REVIEW_LOCAL_ROOTDIR` を設定していなかった場合だけあります

### ソースから build して動かす

```bash
cp .example.env .env      # DATABASE_URL を書く
npm install
npm run prisma:deploy
npm run build
npm run start
```
