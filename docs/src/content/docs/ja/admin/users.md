---
title: "Users"
sidebar:
  order: 3
---
ユーザーの一覧を見て、ユーザーを作成したり、role を変えたり、CSV でまとめて作成・更新したりします

<img src="/video-review/images/admin/users/users-section.webp" />

## 1. ユーザーを作成

一覧の下の Create user で作ります

1. Display name、Email、Password（6 文字以上）を入力します
2. Create を押します

作ったユーザーは viewer になり、一覧の末尾に出ます

---

## 2. CSV で一括作成・更新

ユーザーを CSV に書き出し、編集して読み込むと、作成と更新をまとめてできます

### CSV をエクスポート

一覧の上の Export を押すと、`users.csv` がダウンロードされます

※ CLI では `export-users` で書き出せます（[メンテナンス CLI のガイド](/video-review/ja/features/maintenance-cli/)）

### CSV を編集

| 列 | 内容 |
|---|---|
| id | 空欄なら新しく作り、値があればそのユーザーを更新します |
| name | 表示名（必須） |
| email | ログインに使うメールアドレス（作るときは必須） |
| pass | パスワード、6 文字以上（作るときは必須）<br>更新では、リセットするときだけ入力します |
| role | `viewer` か `admin`（作るときに空欄なら `viewer`） |
| active | `true` か `false`（作るときに空欄なら `true`）<br>`false` のユーザーはログインできません |

更新する行で空欄にしたセルは、今の値のままです  
書き出した CSV の pass は、セキュリティのため空欄です  
パスワードを変えたいユーザーだけ、pass に新しいパスワードを入力すると反映されます

※ UTF-8 で保存します  
※ 自分の行の role、active、pass は変えられません

### CSV をインポート

1. Import を押します

<img src="/video-review/images/admin/users/import-button.webp" />

2. CSV ファイルを選んで、Import を押します

<img src="/video-review/images/admin/users/import-dialog.webp" />

インポートに成功すると、作成と更新の人数が表示されます  
エラーがある場合は何も反映されず、行・列・理由の一覧が出ます

---

## 3. role ごとの権限

○ はサーバーの API が許可する操作です

### 閲覧系

| 操作 | guest | viewer | admin |
|---|---|---|---|
| 動画の一覧・フォルダ・メタデータ・リビジョン | Guest 可 の動画だけ | ○ | ○ |
| 動画の再生 | Guest 可 の動画だけ | ○ | ○ |
| 動画ファイルのダウンロード（解像度指定） | × | ○ | ○ |
| コメントの閲覧 | Guest 可 の動画だけ | ○ | ○ |
| 既読の記録 | × | ○ | ○ |
| イベント、VCS の Changes と AI 要約 | Guest 可 の動画だけ | ○ | ○ |

### 書き込み系

| 操作 | guest | viewer | admin |
|---|---|---|---|
| コメントの作成、いいね | Guest 可 の動画だけ | ○ | ○ |
| 動画へのお絵かき | Guest 可 の動画だけ | ○ | ○ |
| コメントの本文・issue 番号の編集、削除 | 自分のもの（ログイン中だけ） | 自分のもの | ○ |
| コメントから Jira issue を作る | × | ○ | ○ |
| コメントの通知を送る（Slack / Webhook / Email） | × | ○ | ○ |
| チャット検索と MCP | × | ○ | ○ |
| 自分のプロフィール・アバターの変更 | × | ○ | ○ |
| 動画のアップロード（Web / CLI） | × | × | ○ |
| 動画のメタデータ変更（タグ、要約、Guest 可 フラグ） | × | × | ○ |
| サムネイルの登録、アップロード状況の取得 | × | × | ○ |
| Administration の全操作（ユーザー、動画の削除、連携、API Token） | × | × | ○ |

※ API Token は admin と同じ扱いです（既読の記録だけは本人がいないため使えません）  
※ Guest 可 は動画ごとに admin が立てるフラグです  
※ guest はログインのたびに別人になるため、ログアウトすると自分のコメントも編集・削除できません

