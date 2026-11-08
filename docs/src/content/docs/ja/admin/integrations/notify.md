---
title: "通知（Slack / Webhook / Email）"
sidebar:
  order: 3
---
レビューコメントの通知先です  
必要なものだけ設定します

- Slack（Bot の API token で投稿）
- Webhook（Slack または Microsoft Teams の Incoming Webhook）
- Email（SMTP）

---

## 1. Slack

Administration → Integrations の Slack を開きます

<img src="/video-review/images/admin/integrations/notify/slack-section.webp" />

| 項目 | 内容 |
|---|---|
| Token | Slack App の Bot Token |
| Channel | 投稿先のチャンネル ID |
| Team | Slack のチーム名（入れると VideoReview から Slack のメッセージへ直接飛べます） |

Test & save を押し、Slack に接続できたら保存されます

※ Token を保存すると変えられなくなるので、変えるときは Reset で消してから入れ直します

## 2. Webhook

Administration → Integrations の Webhook を開きます

<img src="/video-review/images/admin/integrations/notify/webhook-section.webp" />

| 項目 | 内容 |
|---|---|
| Target | Slack か Teams |
| URL | Slack または Teams で発行した Incoming Webhook の URL |

Test & save はチャンネルにテストのメッセージを 1 件送り、成功したら保存されます

※ メッセージの形式は Target ごとに VideoReview が組み立てるので、URL 以外の設定はありません  
※ URL を保存すると変えられなくなるので、変えるときは Reset で消してから入れ直します

## 3. Email

VideoReview は SMTP サーバーを内蔵しません  
同梱の Postfix リレーか、社内の SMTP サーバーに渡します

### .env に転送先を設定（Docker）

※ 社内の SMTP サーバーに渡すときは、この手順を飛ばします

`compose.prod.yml` の Postfix リレー（`smtp` サービス）は `--profile smtp` を付けたときだけ起動します  
転送先のメールサーバーを `.env` に書きます

```env
# 転送先の SMTP サーバー（例 Gmail の場合 `[smtp.gmail.com]:587`）
SMTP_RELAYHOST="[smtp.example.com]:587"
# SMTP 認証のユーザー名
SMTP_RELAYHOST_USERNAME="you@example.com"
# SMTP 認証のパスワード
SMTP_RELAYHOST_PASSWORD="xxxx xxxx xxxx xxxx"
```

※ Gmail は 2 段階認証を有効にしてアプリパスワードを発行し、それを `SMTP_RELAYHOST_PASSWORD` に入れます

`.env` を変更後、`--profile smtp` を付けて起動します  
Ollama も使うときは `--profile cpu --profile smtp` のように並べます

```bash
docker compose -f compose.prod.yml --profile smtp up -d
```

### Email セクションの設定

Administration → Integrations の Email を開きます

<img src="/video-review/images/admin/integrations/notify/email-section.webp" />

| 項目 | 内容 |
|---|---|
| Email 送信を有効化 | オンで通知を送ります |
| SMTP host | SMTP サーバーのホスト名（上のリレーなら `smtp`） |
| SMTP port | 上のリレーなら `25` |
| 送信元 | 送信元のアドレス（例 `VideoReview <noreply@example.com>`） |
| TLS 証明書を厳密に検証 | SMTP サーバーが信頼できる証明書を使っているときだけオン |
| テストの送信先 | Test & save が送るテストメールの宛先 |

Test & save を押すと保存され、送信先に 1 通届きます  
届かないときはリレーのログ（`docker compose -f compose.prod.yml logs smtp`）を見ます

<img src="/video-review/images/admin/integrations/notify/test-mail.webp" />
