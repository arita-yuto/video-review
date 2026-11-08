---
title: "Jira"
sidebar:
  order: 1
---
Jira に接続すると、次のことができます

- コメントから Jira の issue を作成、または既存の issue を紐づけ
- issue のステータスをコメントから確認・変更

<img src="/video-review/images/admin/integrations/issue-tracker/jira-section.webp" />

## 1. Test & save で接続

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

## 2. コメントから issue を操作

### Create issue で作成

Comments パネルで、コメントのメニューから Create issue を選びます  
Task と Bug の issue type を設定していると、それぞれの種類で作れます  
コメントの 1 行目が issue のタイトルになり、本文全体と動画・時間・書いた人・コメントへのリンクが説明に入ります

<img src="/video-review/images/admin/integrations/issue-tracker/convert-comment.webp" />

### 既存の issue を紐づけ

コメントの下の issue 欄にキーを入れると、作成済みの issue を後から紐づけられます

<img src="/video-review/images/admin/integrations/issue-tracker/link-existing-issue.webp" />

### Change status でステータス変更

コメントの issue には、ステータスアイコンが付きます  
コメントのメニューの Change status で、ステータスを変えられます

<img src="/video-review/images/admin/integrations/issue-tracker/change-status.webp" />
