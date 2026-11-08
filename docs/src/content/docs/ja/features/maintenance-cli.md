---
title: "VideoReview Maintenance CLI"
sidebar:
  label: "メンテナンス CLI"
  order: 3
---

VideoReview の本体とは別に動く、管理者向けのメンテナンス用 CLI です

※ ビルド済みのものは GitHub の Releases にあります（`video-review-cli-<OS>-<Architecture>`）

## 1. API Token の発行

メンテナンス CLI には API Token が必要です  
admin が管理画面で発行します（[API Token ガイド](/video-review/ja/admin/api-token/)）

## 2. 環境変数の設定

VideoReview のサーバーの URL
> VIDEO_REVIEW_SERVER_URL

発行した API Token
> VIDEO_REVIEW_API_TOKEN

コマンドで直接指定することもできます
> go run . --server http://xxx.xxx.xxx.xxx:3489 --token xxxxxx command --video_id xxx

※ `--server` は `http://` か `https://` から書きます  
※ `--server` と `--token` はコマンド名より前に置きます

## 3. コマンド一覧

##### 最初の管理者を作成
> go run . bootstrap --email Nijika@example.com --pass 123abc

※ 最初の管理者は Web の画面でも作れます  

##### ユーザーを作成
> go run . create-user --name Nijika --email Nijika@example.com --pass 123abc

##### ユーザーを CSV にエクスポート
> go run . export-users --file users.csv

##### CSV からユーザーを一括作成・更新
> go run . import-users --file users.csv

##### CSV の例
| id | name（必須） | email | pass | role | active |
|---|---|---|---|---|---|
|  | Bocchi | bocchi@example.com | secret01 | viewer |  |
| 9b2f6c1e-4a7d-4e0b-8f3a-2c5d7e9a1b40 | Nijika | nijika@example.com |  | admin | false |

※ `id` が空の行はユーザーを作成します（`email` と `pass` は必須）  
※ `id` がある行はそのユーザーを更新し、空欄のセルは今の値のままです  
※ 作成するとき、`role` が空欄なら `viewer`、`active` が空欄なら `true` になります  
※ `export-users` で書き出した CSV の `pass` は空欄なので、パスワードをリセットするときだけ入力します  
※ UTF-8 で保存します  

##### 動画の一覧を取得（JSON）
> go run . get-videos  
> go run . get-videos --include_revisions true  
> go run . get-videos --filter_tree "battle"

※ `--filter_tree` はタイトルかフォルダキーの部分一致で絞り込みます

##### 動画のリビジョンを取得（JSON）
> go run . get-videos-rev --video_id {uuid}

##### 動画を論理削除
> go run . delete-video --video_id {uuid}

##### 動画のリビジョンを削除
> go run . purge-revision --video_id {uuid} --revision 1

※ ファイルも削除するので、元に戻せません

##### 動画をアップロード
> go run . upload-video --title "title" --folder_key "folder_key" --scene_path "scene_path" --video_path "/path/to/video.mp4"

VCS の変更を見るファイルを一緒に登録するときは `--vcs_watch_paths` をカンマ区切りで付けます
> go run . upload-video --title "title" --folder_key "folder_key" --video_path "/path/to/video.mp4" --vcs_watch_paths "Assets/Scenes/Boss.unity,Assets/Prefabs"

##### 動画の vcs_watch_paths を変更
アップロード済みの動画の、VCS の変更を見るファイルを差し替えます
> go run . patch-video --video_id {uuid} --vcs_watch_paths "Assets/Scenes/Boss.unity,Assets/Prefabs"

##### サムネイルを作成
> go run . create-video-tmb --video_id {uuid}  
> go run . create-video-tmb-all

※ CLI を動かす PC に ffmpeg が必要です

##### コメントを取得
> go run . get-comments --video_id {uuid}  

##### タグと要約を追加
> go run . annotate-video-rev --video_rev_id {uuid} --tags "A,B,C" --summary "summary text"

※ 付けた項目だけが変わります（`--tags` だけなら要約はそのまま）

##### 動画のイベントをアップロード
> go run . upload-video-event-context --video_rev_id {uuid} --json_path "events.json"

JSON はイベントの配列です
```json
[
  { "kind": "log", "startMs": 1200, "endMs": 1800, "data": "Boss spawned" },
  { "kind": "subtitle", "startMs": 3000, "endMs": 5000, "data": "Here it comes" }
]
```

※ `kind` はイベントごとに書きます  
※ 同じリビジョンの同じ `kind` のイベントは、アップロードのたびに置き換わります

##### VCS のキャッシュを事前取得
利用者が Changes タブを開く前に、指定した期間の VCS の変更を取得しておきます
> go run . warm-vcs-cache --days 30  
> go run . warm-vcs-cache --from 2026-03-01T00:00:00Z --to 2026-04-01T00:00:00Z

※ 取得済みの日は飛ばします  
※ 取り直すときは `--refresh` を付けます  
※ 日時は `Z` 付き（UTC）で書きます
