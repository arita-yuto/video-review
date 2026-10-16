# Jira

Jira に接続すると、次の 2 つが使えます

- コメントから Jira の issue を作る
- Jira のアカウントでログインする（ログイン画面の JIRA タブ）

※ 対象は Jira Data Center です

<img src="https://github.com/user-attachments/assets/c14c6896-8e6a-416c-a44f-b94e823f17a7" />

## 1. issue 作成を設定する

管理画面の Jira → Issues タブで設定します

| 項目 | 内容 |
|---|---|
| URL | Jira の URL（例 `https://jira.example.com`） |
| Token | Jira の personal access token（Bearer で送られます） |
| Project | issue を作る project のキー |
| Assignee | 作った issue の担当者（任意） |
| Task issue type | コメントから Task を作るときの issue type の名前（任意） |
| Bug issue type | コメントから Bug を作るときの issue type の名前（任意） |

1. 項目を入力します
2. Test & save を押します

Jira に接続して project と issue type を確かめ、成功したら保存されます

※ issue type の名前は、その project にあるものと同じ文字で書きます（無い名前だと Test & save が通りません）  
※ Token を保存すると URL と Token は変えられなくなるので、変えるときは Reset で保存した Token を消してから入れ直します

## 2. Jira ログインを設定する

管理画面の Jira → Login タブで設定します  
URL は Issues タブに保存したものを使います

### Jira 管理者に Incoming リンクを作ってもらう

Jira 管理者に次の 2 つを渡して、Application links に Incoming リンクを作ってもらいます

- リダイレクト URL（Login タブの Callback URL に表示されているもの）
- 権限は Read

作成されると Client ID と Client Secret が発行されるので、受け取ります

※ リダイレクト URL は https が必須です（[https ガイド](../../build.run/https-guide.jp.md)）  
※ Jira 側の手順: [Configure an incoming link](https://confluence.atlassian.com/display/ADMINJIRASERVER/Configure+an+incoming+link)（Atlassian）

### Client ID と Client Secret を保存する

1. Login タブに Client ID と Client Secret を入力します
2. Test & save を押します

Jira に接続して Client ID と Client Secret を確かめ、成功したら保存されます  
保存すると、ログイン画面の JIRA タブに「Jira でログイン」ボタンが出ます

---

## 3. 使う

### コメントから issue を作る

Comments パネルで、コメントのメニューから Create issue を選びます  
Task と Bug の issue type を設定していると、それぞれの種類で作れます

<img src="https://github.com/user-attachments/assets/b6543793-3244-4284-a997-d6f057e9424c" />

### Jira のアカウントでログインする

ログイン画面の JIRA タブを開きます

- Login タブを設定していれば、「Jira でログイン」ボタンを押し、Jira の画面で許可します
- 設定していなければ、Jira のメールアドレスと、Jira のパスワードまたは personal access token を入力します

初回ログインで Jira アカウントのメールアドレスと表示名が VideoReview に登録され、Jira アカウントと紐づけされます
