# 管理画面ガイド

管理者は Web UI の Administration から、ユーザー、動画、連携、API Token を設定します  
`.env` を編集したりサーバーを再起動したりする必要はありません

---

## 1. 最初の管理者を登録する

デプロイ直後はユーザーが 1 人もいないので、Web UI から管理者を登録します

1. ブラウザでルート URL を開きます（Docker なら `http://localhost:3489`）
2. 未初期化のときはセットアップ画面（`/bootstrap`）に移ります
3. メールアドレスとパスワード（6 文字以上）を入力し、Initialize を押します

<img src="https://github.com/user-attachments/assets/fb096964-9dba-4941-a5ea-af8cf4087392" width="400" />

登録したユーザーは admin になり、そのままログインした状態になります

※ パスワードをリセットする画面はないので、管理者の認証情報は失くさないように保管してください

---

## 2. Administration を開く

1. admin でログインします
2. 画面左下の歯車アイコンを押します
3. Administration を選びます

左にセクションの一覧、右にその内容が出ます  
Administration は admin にだけ表示されます

---

## 3. 各セクション

| セクション | 詳細 | ガイド |
|---|---|---|
| General | Guest ログイン、ログイン画面の既定タブ、URL scheme、解像度プリセット、アップロードのチャンクサイズ | [general.jp.md](general.jp.md) |
| Users | ユーザーの一覧、作成、role の変更 | [users.jp.md](users.jp.md) |
| Videos | 動画の一覧と、動画やリビジョンの削除 | [videos.jp.md](videos.jp.md) |
| Jira | Jira への接続、コメントからの issue 作成、Jira ログイン | [integrations/issue-tracker.jp.md](integrations/issue-tracker.jp.md) |
| Slack / Webhook / Email | コメントの通知先 | [integrations/notify.jp.md](integrations/notify.jp.md) |
| AI / MCP | LLM プロバイダー、チャット検索、AI エージェント | [AI 機能ガイド](../build.run/ai-guide.jp.md) |
| VCS | GitHub への接続と、動画に結びつくコード変更の表示 | [integrations/vcs.jp.md](integrations/vcs.jp.md) |
| API Token | メンテナンス CLI と AI エージェントが使うトークン | [api-token.jp.md](api-token.jp.md) |


