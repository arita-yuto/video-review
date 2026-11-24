---
title: "動画の処理ガイド"
sidebar:
  label: "動画の処理"
  order: 5
---
アップロードした動画は、worker（`video-processing`）がサムネイルと低解像度の動画を作ります  
処理待ちの動画が多いときに、`run-once` でまとめて処理する手順です

---

## 1. 処理待ちの本数を確認

処理待ちの動画があると、admin のアカウントのメニューに本数が出ます

<img width="660" src="/video-review/images/features/video-processing/account-menu.webp" />

※ 本数は、メニューを開くたびに更新されます

---

## 2. run-once でまとめて処理

`run-once` は、処理待ちの動画をすべて処理して終了するコマンドです  
動いている worker と同時に実行できます

##### 処理待ちの動画が多い
アップグレードで全ての動画が再エンコード待ちになったときなど、  
worker 1 つでは時間がかかります  
worker のサーバーや別のマシンで `run-once` を実行すると、worker と並行して処理が進みます

##### S3 + Lambda の構成
Lambda はアップロードされた動画だけを処理するため、  
アップグレードで再エンコード待ちになった動画は `run-once` で処理します

※ S3 と同じリージョンの EC2 などで実行すると、動画の転送料金を抑えられます

### Docker

`compose.prod.yml` のフォルダで実行します

```bash
docker compose -f compose.prod.yml run --rm video-processing npm run video-processing:run-once
```

S3 + Lambda の構成では、Web と同じ設定の `.env` があるフォルダで実行します

```bash
docker run --rm --env-file .env ghcr.io/arita-yuto/video-review/video-processing npm run video-processing:run-once
```

※ `--env-file` で渡す `.env` は、値を `"` で囲みません

### Local / On‑premise

インストール先のフォルダで実行します

```bash
./video-review-cli run-once
```

---

## 3. reencode-video で再エンコード

低解像度の作成に失敗した動画は、メンテナンス CLI でキューに入れ直します  
[メンテナンス CLI ガイド](/video-review/ja/features/maintenance-cli/)

> go run . reencode-video --video_id {uuid}
