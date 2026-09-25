# 通知（Slack / Webhook / Email）

レビューコメントの通知先です  
必要なものだけ設定します

- Slack（Bot の API token で投稿）
- Webhook（Slack または Microsoft Teams の Incoming Webhook）
- Email（SMTP）

---

## 1. Slack

Administration → Integrations の Slack を開きます

| 項目 | 内容 |
|---|---|
| Token | Slack App の Bot Token |
| Channel | 投稿先のチャンネル ID |
| Team | Slack のチーム名（入れると VideoReview から Slack のメッセージへ直接飛べます） |

1. 項目を入力します
2. Test & save を押します

Slack に接続できた設定だけが保存され、見出しの横の `●` が緑になります

---

## 2. Webhook

Administration → Integrations の Webhook を開きます

| 項目 | 内容 |
|---|---|
| Target | Slack か Teams |
| URL | Slack または Teams で発行した Incoming Webhook の URL |

1. Target を選び、URL を入力します
2. Test & save を押します

Test & save はチャンネルにテストのメッセージを 1 件送り、届いた設定だけが保存されます

※ メッセージの形式は Target ごとに VideoReview が組み立てるので、URL 以外の設定はありません  
※ URL を保存すると変えられなくなるので、変えるときは Reset で消してから入れ直します

---

## 3. Email

VideoReview は SMTP サーバーを内蔵しません  
手元の SMTP リレー（Postfix など）か、社内の SMTP サーバーに渡します

```
VideoReview
   ↓ SMTP
Postfix（コンテナ）
   ↓ SMTP relay
外部メールサーバー（Gmail / ISP の SMTP など）
```

### SMTP リレーを用意する（Docker）

`compose.prod.yml` に次のサービスを足します

```yml
smtp:
  image: boky/postfix
  container_name: videoreview-smtp
  environment:
    HOSTNAME: "videoreview.local"
    ALLOW_EMPTY_SENDER_DOMAINS: "true"
    ALLOWED_NETWORKS: "0.0.0.0/0"
    RELAYHOST: "[smtp.gmail.com]:587"
    RELAYHOST_USERNAME: ""
    RELAYHOST_PASSWORD: ""
  ports:
    - "1025:25"
```

| 変数 | 内容 |
|---|---|
| `RELAYHOST` | 送信先の SMTP サーバー（例 `[smtp.gmail.com]:587`） |
| `RELAYHOST_USERNAME` | SMTP 認証のユーザー名 |
| `RELAYHOST_PASSWORD` | SMTP 認証のパスワード |

※ Gmail は `smtp.gmail.com:587` を指定します

### VideoReview 側を設定する

Administration → Integrations の Email を開きます

| 項目 | 内容 |
|---|---|
| メールを送る | オンで通知を送ります |
| SMTP host | SMTP サーバーのホスト名（上のリレーなら `smtp`） |
| SMTP port | 上のリレーなら `25` |
| 送信元 | 送信元のアドレス（例 `VideoReview <noreply@example.com>`） |
| TLS 証明書を厳密に検証 | SMTP サーバーが信頼できる証明書を使っているときだけオン |

1. 項目を入力します
2. Test & save を押します

SMTP サーバーに接続できた設定だけが保存されます

---

## 4. `.env` から移るときの注意

`.env` の `VIDEO_REVIEW_SLACK_*`、`VIDEO_REVIEW_WEBHOOK_*`、`VIDEO_REVIEW_EMAIL_*`、`VIDEO_REVIEW_SMTP_*` は、管理画面で保存するまでは読まれます  
Test & save を押した時点で `.env` から来ていた値も保存され、以降は `.env` を書き換えても効きません
