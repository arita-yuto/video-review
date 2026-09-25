# General

ログイン画面と動画の扱いに関わる設定です  
接続先はないので、Save を押すとそのまま保存され、次の画面表示から効きます

---

## 1. 開く

Administration → General を開きます

---

## 2. 設定する

| 項目 | 内容 | 既定値 |
|---|---|---|
| Guest ログイン | オフにするとログイン画面から Guest タブが消え、サーバーも Guest ログインを拒否する | オン |
| ログイン画面の既定タブ | ログイン画面が最初に開くタブ（Guest / JIRA / Email & Password） | Guest |
| URL scheme | 動画の Open Scene ボタンが開くリンク（`{scenePath}` が動画のシーンのパスに置き換わる）、空にするとボタンが出ない | `videoreview://open?scene={scenePath}`（同梱の launcher が登録するもの） |
| Resolution presets | 動画処理が作る縮小版の幅をピクセルでカンマ区切りに書く（例 `480,720,1080`）、空なら縮小版を作らない | 空 |
| Upload chunk (MB) | 動画アップロードの 1 チャンクの大きさ、サーバーの前のプロキシがこの大きさを拒否するときに下げる | 16 |

1. 値を変えます
2. Save を押します

※ Guest ログインを既定タブにしたままオフにすると、ログイン画面は Email & Password で開きます  
※ Resolution presets はこれ以降に処理される動画に効きます（処理済みの動画の縮小版は作り直されません）  
※ Upload chunk は、S3 をストレージにしているときは 5 以上にします  
※ Upload chunk はメンテナンス CLI にも同じ値が渡るので、CLI 側の設定はありません

---

## 3. `.env` から移るときの注意

`.env` の次の変数は、管理画面で保存するまでは読まれます

- `VIDEO_REVIEW_ALLOW_GUEST`（`NEXT_PUBLIC_VIDEO_REVIEW_ALLOW_GUEST` も同じ扱いで、どちらかが `false` なら Guest はオフ）
- `NEXT_PUBLIC_VIDEO_REVIEW_LOGIN_DEFAULT_TYPE`
- `NEXT_PUBLIC_VIDEO_REVIEW_URL_SCHEMA`
- `NEXT_PUBLIC_VIDEO_REVIEW_RESOLUTION_PRESETS`
- `VIDEO_REVIEW_UPLOAD_CHUNK_MB`

Save を押した時点で、`.env` から来ていた値も含めて全項目が保存されます  
以降は `.env` を書き換えても効かないので、管理画面で変えます
