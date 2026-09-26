# 通知（Slack / Webhook / Email）

レビューコメントの通知先です  
必要なものだけ設定します

- Slack（Bot の API token で投稿）
- Webhook（Slack または Microsoft Teams の Incoming Webhook）
- Email（SMTP）

---

## 1. Slack

Administration → Integrations の Slack を開きます

<img src="https://github.com/user-attachments/assets/fd3676ec-2366-4a32-aa85-d10b5e631e4a" />

| 項目 | 内容 |
|---|---|
| Token | Slack App の Bot Token |
| Channel | 投稿先のチャンネル ID |
| Team | Slack のチーム名（入れると VideoReview から Slack のメッセージへ直接飛べます） |

Test & save を押し、Slack に接続に成功したら設定が保存されます

※ Token を保存すると変えられなくなるので、変えるときは Reset で消してから入れ直します

## 2. Webhook

Administration → Integrations の Webhook を開きます

<img src="https://github.com/user-attachments/assets/53122012-649d-43ad-8de6-849a9f2bd288" />

| 項目 | 内容 |
|---|---|
| Target | Slack か Teams |
| URL | Slack または Teams で発行した Incoming Webhook の URL |

Test & save はチャンネルにテストのメッセージを 1 件送り、成功したら保存されます

※ メッセージの形式は Target ごとに VideoReview が組み立てるので、URL 以外の設定はありません  
※ URL を保存すると変えられなくなるので、変えるときは Reset で消してから入れ直します

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

<img src="https://github.com/user-attachments/assets/a07c85fc-b006-4d97-9b4a-a944a8bf7ca2" />

| 項目 | 内容 |
|---|---|
| メールを送る | オンで通知を送ります |
| SMTP host | SMTP サーバーのホスト名（上のリレーなら `smtp`） |
| SMTP port | 上のリレーなら `25` |
| 送信元 | 送信元のアドレス（例 `VideoReview <noreply@example.com>`） |
| TLS 証明書を厳密に検証 | SMTP サーバーが信頼できる証明書を使っているときだけオン |

Test & save を押し、SMTP サーバーに接続できた設定だけが保存されます


