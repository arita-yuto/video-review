# Notifications (Slack / Webhook / Email)

Where review comments are announced.
Set up only what you need.

- Slack (posting with a bot API token)
- Webhook (an Incoming Webhook of Slack or Microsoft Teams)
- Email (SMTP)

---

## 1. Slack

Open Administration → Integrations → Slack.

| Field | Meaning |
|---|---|
| Token | The Slack app's bot token |
| Channel | The ID of the channel to post to |
| Team | The Slack team name; with it, VideoReview links straight to the Slack message |

1. Fill in the fields.
2. Press Test & save.

Only settings that reach Slack are saved, and the `●` next to the heading turns green.

---

## 2. Webhook

Open Administration → Integrations → Webhook.

| Field | Meaning |
|---|---|
| Target | Slack or Teams |
| URL | The Incoming Webhook URL issued by Slack or Teams |

1. Pick the Target and enter the URL.
2. Press Test & save.

Test & save posts one test message to the channel and saves only settings that get through.

- VideoReview builds the message for each Target, so there is nothing to set besides the URL.
- Once the URL is saved it is locked. To change it, press Reset to drop it and enter it again.

---

## 3. Email

VideoReview has no SMTP server of its own.
It hands mail to an SMTP relay (Postfix or similar) or to your SMTP server.

```
VideoReview
   ↓ SMTP
Postfix (container)
   ↓ SMTP relay
Mail server (Gmail, your ISP's SMTP, ...)
```

### Set up an SMTP relay (Docker)

Add this service to `compose.prod.yml`:

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

| Variable | Meaning |
|---|---|
| `RELAYHOST` | The SMTP server to relay to, e.g. `[smtp.gmail.com]:587` |
| `RELAYHOST_USERNAME` | The user name for SMTP authentication |
| `RELAYHOST_PASSWORD` | The password for SMTP authentication |

Gmail takes `smtp.gmail.com:587`.

### Configure VideoReview

Open Administration → Integrations → Email.

| Field | Meaning |
|---|---|
| Send email | On sends the notifications |
| SMTP host | The SMTP server's host name (`smtp` for the relay above) |
| SMTP port | `25` for the relay above |
| From | The sender address, e.g. `VideoReview <noreply@example.com>` |
| Strict TLS | On only when the SMTP server has a trusted certificate |

1. Fill in the fields.
2. Press Test & save.

Only settings that reach the SMTP server are saved.

---

## 4. Moving from `.env`

The `VIDEO_REVIEW_SLACK_*`, `VIDEO_REVIEW_WEBHOOK_*`, `VIDEO_REVIEW_EMAIL_*` and `VIDEO_REVIEW_SMTP_*` variables are read until you save on the admin screen.
Test & save also stores the values that came from `.env`; from then on `.env` has no effect.
