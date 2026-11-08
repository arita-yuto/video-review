---
title: "管理画面ガイド"
sidebar:
  label: "概要"
  order: 1
---
管理者は Web UI の Administration から、ユーザー、動画、連携、API Token を設定します  
`.env` を編集したりサーバーを再起動したりする必要はありません

---

## 1. 最初の管理者を登録

デプロイ直後はユーザーが 1 人もいないので、Web UI から管理者を登録します

1. ブラウザでルート URL を開きます（Docker なら `http://localhost:3489`）
2. 未初期化のときはセットアップ画面（`/bootstrap`）に移ります
3. メールアドレスとパスワード（6 文字以上）を入力し、Initialize を押します

<img src="/video-review/images/admin/register-administrator.webp" width="400" />

登録したユーザーは admin になり、そのままログインした状態になります

※ パスワードをリセットする画面はないので、管理者の認証情報は失くさないように保管してください

---

## 2. Administration の開き方

1. admin でログインします
2. 画面左下の歯車アイコンを押します
3. Administration を選びます

左にセクションの一覧、右にその内容が出ます  
Administration は admin にだけ表示されます

---

## 3. セクション一覧

| セクション | 詳細 | ガイド |
|---|---|---|
| General | Guest ログイン、ログイン画面の既定タブ、URL scheme、解像度プリセット、アップロードのチャンクサイズ | [General ガイド](/video-review/ja/admin/general/) |
| Users | ユーザーの一覧、作成、role の変更 | [Users ガイド](/video-review/ja/admin/users/) |
| Videos | 動画の一覧と、動画やリビジョンの削除 | [Videos ガイド](/video-review/ja/admin/videos/) |
| Jira | Jira への接続、コメントからの issue 作成 | [Jira ガイド](/video-review/ja/admin/integrations/issue-tracker/) |
| SSO (OIDC) | OneLogin などの IdP との接続と、SSO ログイン | [SSO (OIDC) ガイド](/video-review/ja/admin/integrations/sso/) |
| Slack / Webhook / Email | コメントの通知先 | [通知ガイド](/video-review/ja/admin/integrations/notify/) |
| AI / MCP | LLM プロバイダー、チャット検索、AI エージェント | [AI 機能ガイド](/video-review/ja/features/ai/) |
| VCS | GitHub への接続と、動画に紐づくコード変更の表示 | [VCS ガイド](/video-review/ja/admin/integrations/vcs/) |
| API Token | メンテナンス CLI と AI エージェントが使うトークン | [API Token ガイド](/video-review/ja/admin/api-token/) |


