# Users

ユーザーの一覧、作成、role の変更、CSV での一括作成・更新をします

<img src="https://github.com/user-attachments/assets/a240238d-d412-40b7-80a0-ffd0a9aad974" />

## 1. ユーザーを作る

一覧の下の Create user で作ります

1. Display name、Email、Password（6 文字以上）を入力します
2. Create を押します

作ったユーザーは viewer になり、一覧の末尾に出ます

---

## 2. CSV でまとめて作成・更新する

ユーザーを CSV に書き出し、編集して読み込むと、作成と更新をまとめてできます

### CSV に書き出す

一覧の上の Export を押すと、`users.csv` がダウンロードされます

※ CLI では `export-users` で書き出せます（[メンテナンス CLI のガイド](../../maintenance/README.jp.md)）

### CSV を編集する

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

### CSV を読み込む

1. Import を押します

<img src="https://github.com/user-attachments/assets/352911f9-6063-4d6c-8add-5dd30ddb9799" />

2. CSV ファイルを選んで、Import を押します

<img src="https://github.com/user-attachments/assets/849e6b93-7ffd-4dc4-8308-fc035d92ed91" />

取り込みに成功した場合、作成と更新の人数が表示されます  
エラーがある場合は何も反映されず、行・列・理由の一覧が出ます

---

## 3. 権限について

サーバーの API が通すかどうかで書いています

### 閲覧系

| 操作 | guest | viewer | admin |
|---|---|---|---|
| 動画の一覧・フォルダ・メタデータ・リビジョン | Guest 可 の動画だけ | ○ | ○ |
| 動画の再生 | Guest 可 の動画だけ | ○ | ○ |
| 動画ファイルのダウンロード（解像度指定） | × | ○ | ○ |
| コメントの閲覧・既読の記録 | ○ | ○ | ○ |
| イベント、VCS の Changes と AI 要約 | Guest 可 の動画だけ | ○ | ○ |

### 書き込み系

| 操作 | guest | viewer | admin |
|---|---|---|---|
| コメントの作成・更新 | ○ | ○ | ○ |
| 動画にお絵かき機能 | ○ | ○ | ○ |
| コメントから Jira issue を作る | × | ○ | ○ |
| コメントの通知を送る（Slack / Webhook / Email） | × | ○ | ○ |
| チャット検索と MCP | × | ○ | ○ |
| 自分のプロフィール・アバターの変更 | × | ○ | ○ |
| 動画のアップロード（Web / CLI） | × | × | ○ |
| 動画のメタデータ変更（タグ、要約、Guest 可 フラグ） | × | × | ○ |
| サムネイルの登録、アップロード状況の取得 | × | × | ○ |
| Administration の全操作（ユーザー、動画の削除、連携、API Token） | × | × | ○ |

※ API Token は admin と同じ扱いです  
※ Guest 可 は動画ごとに admin が立てるフラグです  
※ コメントは動画のフラグに関係なく読み書きできます

