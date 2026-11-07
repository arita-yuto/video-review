---
title: "VCS"
sidebar:
  order: 4
---
リポジトリに接続すると、動画のサイドパネルの Changes タブに、そのリビジョンに結びつくコミットと Pull Request が出ます  
AI 機能を有効にしていると、その要約も出ます（[AI 機能ガイド](/video-review/ja/features/ai/)）

<img src="/video-review/images/admin/integrations/vcs/vcs-section.webp" />

## 1. 接続して保存する

| 項目 | 内容 |
|---|---|
| Provider | GitHub |
| Owner | リポジトリのオーナー（組織名かユーザー名） |
| Repository | リポジトリ名 |
| Token | リポジトリを読める Personal access token |
| Branch | コミットを辿るブランチ（例 `main`） |

1. Provider を選び、項目を入力します
2. Test & save を押します

リポジトリに接続できた設定だけが保存され、その Provider が使用中 `●` になります  
別の VCS に切り替えるときは `この Provider を使う` を押します

※ Token を保存すると Owner、Repository、Token は変えられなくなるので、変えるときは Reset で消してから入れ直します

---

## 2. 動画に結びつける

動画をアップロードするときか、アップロード後に動画を直接指定して、関係するパスを渡します（[メンテナンス CLI のガイド](/video-review/ja/features/maintenance-cli/)）

```bash
# アップロード時
go run . upload-video \
  --title "title" \
  --folder_key "folder_key" \
  --scene_path "scene_path" \
  --video_path "/path/to/video.mp4" \
  --vcs_watch_paths "/path/to/file1,/path/to/file2"
```

```bash
# アップロード後、直接動画を指定
go run . patch-video \
  --video_id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  --vcs_watch_paths "/path/to/file1,/path/to/file2"
```

## 3. 確認方法

Changes タブに、前のリビジョンからアップロード日までの間に、そのパスに触れたコミットと Pull Request が出ます

<img src="/video-review/images/admin/integrations/vcs/changes-tab.webp" width="320" />
