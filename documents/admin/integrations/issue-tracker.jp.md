# Jira

Jira に接続すると、次の 3 つが使えます

- コメントから Jira の issue を作る、または既存の issue を結びつける
- issue のステータスをコメントから見る・変える
- Jira のメールアドレスでログインする（ログイン画面の JIRA タブ）

<img src="https://github.com/user-attachments/assets/c14c6896-8e6a-416c-a44f-b94e823f17a7" />

## 2. 接続して保存する

| 項目 | 内容 |
|---|---|
| Deployment | Jira の種類（Data Center か Cloud） |
| URL | Jira の URL（例 `https://jira.example.com`、Cloud なら `https://example.atlassian.net`） |
| Email | Cloud のときだけ、Token を発行したアカウントのメールアドレス |
| Token | Data Center なら personal access token、Cloud ならアカウントの API token |
| Project | issue を作る project のキー |
| 担当者 | 作った issue の担当者（任意） |
| Task の issue type | コメントから Task を作るときの issue type の名前（任意） |
| Bug の issue type | コメントから Bug を作るときの issue type の名前（任意） |

1. 項目を入力します
2. Test & save を押します

Test & save を押し、Jira に接続して project と issue type を確かめ、成功したら保存されます  


※ issue type の名前は、その project にあるものと同じ文字で書きます（無い名前だと Test & save が通りません）  
※ Token を保存すると URL と Token は変えられなくなるので、変えるときは Reset で保存した Token を消してから入れ直します  
※ Cloud の API token は最長 1 年で切れるので、切れたら Reset して新しい token を入れ直します  

---

## 3. コメントを活用する

### コメントから issue を作る

Comments パネルで、コメントのメニューから Create issue を選びます  
Task と Bug の issue type を設定していると、それぞれの種類で作れます  
コメントの 1 行目が issue のタイトルになり、本文全体と動画・時間・書いた人・コメントへのリンクが説明に入ります

<img src="https://github.com/user-attachments/assets/b6543793-3244-4284-a997-d6f057e9424c" />

### 既存の issue を結びつける

コメントの下の issue 欄にキーを入れると Jira で作成済みチケットと紐づけを後からすることができます  

<img src="https://github.com/user-attachments/assets/0986dfc3-c417-4e7c-b922-0aae32a09e81" />

### ステータスを見る・変える

コメントの issue には、ステータスアイコンが付きます  
コメントのメニューの Change status で issue ステータスを更新も可能です

<img  src="https://github.com/user-attachments/assets/aab3530d-ad58-411a-99ec-475c1a091f9f" />

### Jira のメールアドレスでログインする

ログイン画面の JIRA タブで、Jira に登録しているメールアドレスを入力します  
Jira にそのユーザーがいれば、VideoReview のユーザーが自動で作られてログインします


