# VideoReview Maintenance CLI

VideoReview のメンテナンス用 CLI ツールです  
本体とは別の **管理者向け内部ツール** になります

使い方（API Token、環境変数、コマンド）はサイトのガイドにあります：[メンテナンス CLI](https://arita-yuto.github.io/video-review/ja/features/maintenance-cli/)

## ビルド方法

### Windows
> $env:GOOS="windows"; $env:GOARCH="amd64"; go build -o video-review-cli.exe

### Mac
> GOOS=darwin GOARCH=arm64 go build -o video-review-cli

### Linux
> GOOS=linux GOARCH=amd64 go build -o video-review-cli

※ ビルド済みのものは GitHub の Releases にあります（`video-review-cli-<OS>-<Architecture>`）
