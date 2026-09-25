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
> go run . --server xxx.xxx.xxx.xxx --token xxxxxx command --video_id xxx

### コマンド一覧

##### 管理者を作成します
> go run . bootstrap --email Nijika@example.com --pass 123abc

##### ユーザーを作成します
> go run . create-user --name Nijika --email Nijika@example.com --pass 123abc

##### 動画のリストを取得します（JSON）
> go run . get-videos 
> go run . get-videos --include_revisions true

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

##### サムネイル作成をします
> go run . create-video-tmb --video_id {uuid}  
> go run . create-video-tmb-all

##### コメントを取得します
> go run . get-comments --video_id {uuid}  

##### タグ、要約をつけます
`手動でタグと要約をつけます`
> go run . annotate-video-rev --video_rev_id {uuid} --tags "A,B,C" --summary "summary text"

`自動（ローカルLLMを利用します）`
> go run . auto-ai-annotate-video-rev

> go run . auto-ai-annotate-video-rev --video_rev_id {uuid}　

`自動（動画の解析結果、動画イベント情報からルールに基づいてタグをつけます）`
> go run . auto-deterministic-annotate-video-rev

> go run . auto-deterministic-annotate-video-rev --video_rev_id {uuid}　

##### 動画のイベント情報をアップロードします
> go run . upload-video-event-context --video_id {uuid}　--kind {log|subtitle|etc} --jsonPath "json_path"