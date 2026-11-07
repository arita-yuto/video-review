---
title: "General"
sidebar:
  order: 2
---
ログイン画面と動画の扱いに関わる設定です  
接続先はないので、Save を押すとそのまま保存され、次の画面表示から効きます

<img src="/video-review/images/admin/general/general-section.webp" />

## 1. 設定する

| 項目 | 内容 | 既定値 |
|---|---|---|
| Guest ログイン | オンにするとログイン画面に Guest タブが出て、誰でも Guest としてログインできる | オフ |
| ログイン画面の既定タブ | ログイン画面が最初に開くタブ（Guest / Email & Password / SSO） | Guest（Guest ログインがオフなら Email & Password） |
| URL scheme | 動画の Open Scene ボタンが開くリンク（`{scenePath}` が動画のシーンのパスに置き換わる）、空にするとボタンが出ない | `videoreview://open?scene={scenePath}`（同梱の launcher が登録するもの） |
| Resolution presets | 動画処理が作る縮小版の幅をピクセルでカンマ区切りに書く（例 `480,720,1080`）、空なら縮小版を作らない | 空 |
| Upload chunk (MB) | 動画アップロードの 1 チャンクの大きさ、サーバーの前のプロキシがこの大きさを拒否するときに下げる | 16 |
| Check for updates | オンにすると、GitHub に新しいリリースがあるか確かめる | オフ |

※ Resolution presets はこれ以降に処理される動画に効きます（処理済みの動画の縮小版は作り直されません）  
※ S3 をストレージにしているときは、直接送るため Upload chunk は使われません  

## 2. 新しいリリースに更新する

Check for updates がオンなら、新しいリリースが出たとき、アカウントのメニューと Check for updates の横に `… available` が出ます

<img src="/video-review/images/admin/general/account-menu-update.webp" />

押すと、リリースノートが開きます

<img src="/video-review/images/admin/general/release-dialog.webp" />

[Local / On‑premise ガイド](/video-review/ja/install/local/) の手順で入れたサーバーでは、Update を押すと更新します  
更新が完了したら、Reload で画面を読み込み直します

※ Docker で動かしている場合は、コンテナの中の VideoReview が自分のコンテナを入れ替えられないため、Update が出ません  
[Docker ガイド](/video-review/ja/install/docker/) の手順で更新します
