# General

ログイン画面と動画の扱いに関わる設定です  
接続先はないので、Save を押すとそのまま保存され、次の画面表示から効きます

<img src="ここにGeneralの画像を入れる">

## 1. 設定する

| 項目 | 内容 | 既定値 |
|---|---|---|
| Guest ログイン | オフにするとログイン画面から Guest タブが消え、サーバーも Guest ログインを拒否する | オン |
| ログイン画面の既定タブ | ログイン画面が最初に開くタブ（Guest / JIRA / Email & Password） | Guest |
| URL scheme | 動画の Open Scene ボタンが開くリンク（`{scenePath}` が動画のシーンのパスに置き換わる）、空にするとボタンが出ない | `videoreview://open?scene={scenePath}`（同梱の launcher が登録するもの） |
| Resolution presets | 動画処理が作る縮小版の幅をピクセルでカンマ区切りに書く（例 `480,720,1080`）、空なら縮小版を作らない | 空 |
| Upload chunk (MB) | 動画アップロードの 1 チャンクの大きさ、サーバーの前のプロキシがこの大きさを拒否するときに下げる | 16 |

※ Resolution presets はこれ以降に処理される動画に効きます（処理済みの動画の縮小版は作り直されません）  
※ S3 をストレージにしているときは、直接送るため Upload chunk は使われません  
