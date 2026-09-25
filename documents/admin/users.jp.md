# Users

ユーザーの一覧、作成、role の変更をします

---

## 1. 開く

Administration → Users を開きます  
ユーザーが作成日の順に並びます（表示名、メールアドレス、role、作成日）

---

## 2. ユーザーを作る

一覧の下の Create user で作ります

1. Display name、Email、Password（6 文字以上）を入力します
2. Create を押します

作ったユーザーは viewer になり、一覧の末尾に出ます

※ Guest はここでは作りません  
※ Guest ログインが有効なら、誰でも表示名だけでログインできます（[General](general.jp.md)）  
※ Jira ログインのユーザーは、初めてログインしたときに自動で作られます（[Jira](integrations/issue-tracker.jp.md)）

---

## 3. role を変える

一覧の Role の列で、Viewer と Admin を切り替えます  
選んだ時点で保存されます

| role | できること |
|---|---|
| viewer | 動画の閲覧とコメント、アップロード |
| admin | viewer のすべてと、Administration の操作 |

※ 自分自身の role も変えられますが、admin を 1 人も残さないと Administration を開けなくなります  
※ ユーザーの削除はできません（コメントや既読の記録がユーザーに結びついているため）
