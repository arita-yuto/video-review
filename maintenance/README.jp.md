# VideoReview Maintenance CLI

VideoReview のメンテナンス用 CLI ツールです  
本体とは別の **管理者向け内部ツール** になります

## ビルド方法

### Windows
> $env:GOOS="windows"; $env:GOARCH="amd64"; go build -o video-review-cli.exe

### Mac
> GOOS=darwin GOARCH=arm64 go build -o video-review-cli

### Linux
> GOOS=linux GOARCH=amd64 go build -o video-review-cli

※ ビルド済みのものは GitHub の Releases にあります（`video-review-cli-<OS>-<Architecture>`）

### API Tokenの生成

VideoReviewのメンテナンスCLIを利用するためには、APIトークンが必要になります  
adminユーザーがWebUI上でトークンを発行することができます

詳しくは、[管理画面ガイド](../documents/admin/api-token.jp.md) でご確認ください


### 必須環境変数

VideoReviewを動作させているサーバーURL
> VIDEO_REVIEW_SERVER_URL

VideoReview にて発行した API トークンを設定
> VIDEO_REVIEW_API_TOKEN

コマンドに直接指定することも可能です
> go run . --server http://xxx.xxx.xxx.xxx:3489 --token xxxxxx command --video_id xxx

※ `--server` は `http://` か `https://` から書きます  
※ `--server` と `--token` はコマンド名より前に置きます

### コマンド一覧

##### 最初の管理者を作成します
> go run . bootstrap --email Nijika@example.com --pass 123abc

※ 最初の管理者は Web の画面でも作れます  

##### ユーザーを作成します
> go run . create-user --name Nijika --email Nijika@example.com --pass 123abc

##### ユーザーを CSV に書き出します
> go run . export-users --file users.csv

##### CSV からユーザーをまとめて作成・更新します
> go run . import-users --file users.csv

##### CSV の例
| id | name（必須） | email | pass | role | active |
|---|---|---|---|---|---|
|  | Bocchi | bocchi@example.com | secret01 | viewer |  |
| 9b2f6c1e-4a7d-4e0b-8f3a-2c5d7e9a1b40 | Nijika | nijika@example.com |  | admin | false |

※ `id` が空の行は、ユーザーを作成します。`email` と `pass` は必須です  
※ `id` がある行は、そのユーザーを更新します。空欄のセルは今の値のままです  
※ 作成するとき、`role` が空欄なら `viewer`、`active` が空欄なら `true` になります  
※ `export-users` で書き出した CSV の `pass` は空欄です。パスワードをリセットするときだけ入力します  
※ UTF-8 で保存します  

##### 動画のリストを取得します（JSON）
> go run . get-videos  
> go run . get-videos --include_revisions true  
> go run . get-videos --filter_tree "battle"

※ `--filter_tree` はタイトルかフォルダーキーの部分一致で絞り込みます

##### 動画のリビジョン情報を取得します（JSON）
> go run . get-videos-rev --video_id {uuid}

##### 動画を論理削除します
> go run . delete-video --video_id {uuid}

##### 動画の該当リビジョンを削除します
* ファイル削除＋論理削除を行います
* 実行後に元に戻すことはできません
> go run .  purge-revision --video_id {uuid} --revision 1

##### 動画をアップロードします
> go run . upload-video --title "title" --folder_key "folder_key" --scene_path "scene_path" --video_path "/path/to/video.mp4"

VCS の変更を見るファイルを一緒に登録するときは `--vcs_watch_paths` をカンマ区切りで付けます
> go run . upload-video --title "title" --folder_key "folder_key" --video_path "/path/to/video.mp4" --vcs_watch_paths "Assets/Scenes/Boss.unity,Assets/Prefabs"

##### 動画の設定を変更します
アップロード済みの動画の、VCS の変更を見るファイルを差し替えます
> go run . patch-video --video_id {uuid} --vcs_watch_paths "Assets/Scenes/Boss.unity,Assets/Prefabs"

##### サムネイル作成をします
> go run . create-video-tmb --video_id {uuid}  
> go run . create-video-tmb-all

※ CLI を動かす PC に ffmpeg が必要です

##### コメントを取得します
> go run . get-comments --video_id {uuid}  

##### タグ、要約をつけます
> go run . annotate-video-rev --video_rev_id {uuid} --tags "A,B,C" --summary "summary text"

※ 付けた項目だけが変わります（`--tags` だけなら要約はそのまま）

##### 動画のイベント情報をアップロードします
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

##### VCS のキャッシュを温めます
利用者が Changes タブを開く前に、指定した期間の VCS の変更を取得しておきます
> go run . warm-vcs-cache --days 30  
> go run . warm-vcs-cache --from 2026-03-01T00:00:00Z --to 2026-04-01T00:00:00Z

※ 取得済みの日は飛ばします  
※ 取り直すときは `--refresh` を付けます  
※ 日時は `Z` 付き（UTC）で書きます
