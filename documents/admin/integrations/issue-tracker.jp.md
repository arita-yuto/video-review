# Jira

Jira に接続すると、次の 2 つが使えます

- コメントから Jira の issue を作る
- Jira のメールアドレスでログインする（ログイン画面の JIRA タブ）

---

## 1. 開く

Administration → Integrations の Jira を開きます

---

## 2. 接続して保存する

| 項目 | 内容 |
|---|---|
| URL | Jira の URL（例 `https://example.atlassian.net`） |
| Token | Jira の API token（Bearer で送られます） |
| Project | issue を作る project のキー |
| 担当者 | 作った issue の担当者（任意） |
| Task の issue type | コメントから Task を作るときの issue type の名前（任意） |
| Bug の issue type | コメントから Bug を作るときの issue type の名前（任意） |

1. 項目を入力します
2. Test & save を押します

Jira に接続して project と issue type を確かめ、通った設定だけが保存されます  
見出しの横の `●` が緑なら接続できています

※ issue type の名前は、その project にあるものと同じ文字で書きます（無い名前だと Test & save が通りません）  
※ Token を保存すると URL と Token は変えられなくなるので、変えるときは Reset で保存した Token を消してから入れ直します

---

## 3. 使う

### コメントから issue を作る

Comments パネルで、コメントのメニューから Create issue を選びます  
Task と Bug の issue type を設定していると、それぞれの種類で作れます

### Jira のメールアドレスでログインする

ログイン画面の JIRA タブで、Jira に登録しているメールアドレスを入力します  
Jira にそのユーザーがいれば、VideoReview のユーザーが自動で作られてログインします

---

## 4. `.env` から移るときの注意

`.env` の `VIDEO_REVIEW_JIRA_*` は、管理画面で保存するまでは読まれます  
Test & save を押した時点で `.env` から来ていた値も保存され、以降は `.env` を書き換えても効きません
