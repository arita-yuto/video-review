# Jira

Jira に接続すると、次の 2 つが使えます

- コメントから Jira の issue を作る
- Jira のメールアドレスでログインする（ログイン画面の JIRA タブ）

<img src="https://github.com/user-attachments/assets/c14c6896-8e6a-416c-a44f-b94e823f17a7" />

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

Test & save を押し、Jira に接続して project と issue type を確かめ、成功したら保存されます  


※ issue type の名前は、その project にあるものと同じ文字で書きます（無い名前だと Test & save が通りません）  
※ Token を保存すると URL と Token は変えられなくなるので、変えるときは Reset で保存した Token を消してから入れ直します

---

## 3. 使う

### コメントから issue を作る

Comments パネルで、コメントのメニューから Create issue を選びます  
Task と Bug の issue type を設定していると、それぞれの種類で作れます

<img src="https://github.com/user-attachments/assets/b6543793-3244-4284-a997-d6f057e9424c" />

### Jira のメールアドレスでログインする

ログイン画面の JIRA タブで、Jira に登録しているメールアドレスを入力します  
Jira にそのユーザーがいれば、VideoReview のユーザーが自動で作られてログインします


