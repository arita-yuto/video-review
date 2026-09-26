# Notifications (Slack / Webhook / Email)

Where review comments are announced.
Set up only what you need.

- Slack (posting with a bot API token)
- Webhook (an Incoming Webhook of Slack or Microsoft Teams)
- Email (SMTP)

---

## 1. Slack

Open Administration → Integrations → Slack.

<img src="https://github.com/user-attachments/assets/fd3676ec-2366-4a32-aa85-d10b5e631e4a" />

| Field | Meaning |
|---|---|
| Token | The Slack app's bot token |
| Channel | The ID of the channel to post to |
| Team | The Slack team name (with it, VideoReview links straight to the Slack message) |

Press Test & save; the settings are saved once Slack accepts the connection.

Note: once the token is saved it cannot be changed; press Reset to drop it and enter it again.

## 2. Webhook

Open Administration → Integrations → Webhook.

<img src="https://github.com/user-attachments/assets/53122012-649d-43ad-8de6-849a9f2bd288" />

| Field | Meaning |
|---|---|
| Target | Slack or Teams |
| URL | The Incoming Webhook URL issued by Slack or Teams |

Test & save posts one test message to the channel and saves the settings when it gets through.

Note: VideoReview builds the message for each Target, so there is nothing to set besides the URL.  
Note: once the URL is saved it cannot be changed; press Reset to drop it and enter it again.

## 3. Email

VideoReview has no SMTP server of its own.
It hands mail to an SMTP relay near it (Postfix or similar) or to your SMTP server.

```
VideoReview
   ↓ SMTP
Postfix (container)
   ↓ SMTP relay
Mail server (Gmail, your ISP's SMTP, ...)
```

### Set where the SMTP relay forwards to (Docker)

`compose.prod.yml` includes a Postfix relay (the `smtp` service).
Put the mail server it forwards to in `.env`:

```env
SMTP_RELAYHOST="[smtp.gmail.com]:587"
SMTP_RELAYHOST_USERNAME="you@gmail.com"
SMTP_RELAYHOST_PASSWORD="xxxx xxxx xxxx xxxx"
```

| Variable | Meaning |
|---|---|
| `SMTP_RELAYHOST` | The SMTP server to forward to (e.g. `[smtp.gmail.com]:587`) |
| `SMTP_RELAYHOST_USERNAME` | The user name for SMTP authentication |
| `SMTP_RELAYHOST_PASSWORD` | The password for SMTP authentication |

Note: for Gmail, turn on 2-Step Verification, create an App Password, and put it in `SMTP_RELAYHOST_PASSWORD`.  
Note: with all three empty, Postfix tries to deliver straight to the recipient's mail server, and most networks block outbound port 25, so nothing arrives.

After changing `.env`, recreate the `smtp` service:

```bash
docker compose -f compose.prod.yml up -d smtp
```

### Hand mail to your own SMTP server

If you have an SMTP server in-house, leave the three variables empty.
Point SMTP host at that server in "Configure VideoReview" below.
The `smtp` service stays idle; leaving it running does no harm.

### Configure VideoReview

Open Administration → Integrations → Email.

<img src="https://github.com/user-attachments/assets/a07c85fc-b006-4d97-9b4a-a944a8bf7ca2" />

| Field | Meaning |
|---|---|
| Send email | On sends the notifications |
| SMTP host | The SMTP server's host name (`smtp` for the relay above) |
| SMTP port | `25` for the relay above |
| From | The sender address (e.g. `VideoReview <noreply@example.com>`) |
| Strict TLS | On only when the SMTP server has a trusted certificate |

Press Test & save; only settings that reach the SMTP server are saved.

Note: Test only checks the connection to the relay, not the forwarding beyond it.

To confirm delivery, post one comment and see that the mail arrives.
