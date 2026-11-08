---
title: "Videos"
sidebar:
  order: 4
---
動画の一覧を見て、動画やリビジョンのファイルを削除したり、CSV でまとめて移動・名前の変更をしたりします

<img src="/video-review/images/admin/videos/videos-section.webp" />

## 1. 動画を削除

1. 行の右の Delete を押します
2. 確認の入力欄に `Delete` と打ちます（大文字・小文字も合わせます）
3. Delete を押します

<img src="/video-review/images/admin/videos/delete-video.webp" />

※ 動画を削除すると、リビジョンも全て削除され、動画は一覧から消えます  
※ 同じフォルダキーとタイトルでアップロードし直すと、残っていたコメントがまた表示されます

---

## 2. リビジョンだけ削除

1. 矢印 `>` でリビジョンの一覧を開きます
2. 消したいリビジョンの Delete を押し、同じように `Delete` と打って確定します

<img src="/video-review/images/admin/videos/delete-revision.webp" />

※ 削除したリビジョンの動画は見られなくなります

---

## 3. CSV で一括移動・名前変更

動画の一覧を CSV に書き出し、フォルダとタイトルを書き換えて読み込むと、移動と名前の変更をまとめてできます

### CSV をエクスポート

一覧の上の Export を押すと、`videos.csv` がダウンロードされます

### CSV を編集

| 列 | 内容 |
|---|---|
| id | 動画の id（書き換えない） |
| folder | フォルダキー<br>書き換えると、その動画を別のフォルダへ移します |
| title | タイトル<br>書き換えると、名前が変わります |
| files | リビジョンごとのファイルの置き場所（読み込むときは使わない） |

変えたくない動画の行は、そのままにするか、消してかまいません  
同じフォルダに同じタイトルの動画は置けません

※ UTF-8 で保存します  
※ 移動・名前の変更のあとに、古いフォルダキーとタイトルでアップロードすると、別の新しい動画になります  
※ CLI や Unity / UE から上げているときは、送るフォルダキーとタイトルも合わせて変えます

### CSV をインポート

1. 一覧の上の Import を押します

<img src="/video-review/images/admin/videos/import-button.webp" />

2. CSV ファイルを選んで、Import を押します

<img src="/video-review/images/admin/videos/import-dialog.webp" />

インポートに成功すると、更新した動画の本数が表示されます  
エラーがある場合は何も反映されず、行・列・理由の一覧が出ます
