# Admin Screen Guide

Administrators manage users, videos, integrations and the API token from Administration in the Web UI.
There is no need to edit `.env` or restart the server.

---

## 1. Register the first administrator

Right after deployment there are no users, so the first administrator is registered from the Web UI.

1. Open the root URL in a browser (`http://localhost:3489` with Docker).
2. While nothing is initialized you land on the setup screen (`/bootstrap`).
3. Enter an email address and a password (6 characters or more) and press Initialize.

<img src="https://github.com/user-attachments/assets/fb096964-9dba-4941-a5ea-af8cf4087392" width="400" />

The user you register is an admin and is logged in right away.

- When you are not working on the server itself, use the server's host name and the port published in `compose.prod.yml`.
- On the first start the page shows "Database is preparing..." for a few seconds and retries on its own.
- The setup screen only opens while nothing is initialized. After that the root URL goes to the login screen.
- There is no password reset screen, so keep the administrator's credentials somewhere safe.

---

## 2. Open Administration

1. Log in as an admin.
2. Press the gear icon at the bottom left.
3. Choose Administration.

The sections are listed on the left and the selected one is shown on the right.
Administration is shown to admins only.

---

## 3. Sections

| Section | What it does | Guide |
|---|---|---|
| General | Guest login, the default login tab, the URL scheme, resolution presets, the upload chunk size | [general.md](general.md) |
| Users | List, create and change the role of users | [users.md](users.md) |
| Videos | List videos and delete videos or revisions | [videos.md](videos.md) |
| Jira | Connect to Jira, create issues from comments, log in with Jira | [integrations/issue-tracker.md](integrations/issue-tracker.md) |
| Slack / Webhook / Email | Where comments are announced | [integrations/notify.md](integrations/notify.md) |
| AI / MCP | The LLM provider, chat search, AI agents | [AI Features Guide](../build.run/ai-guide.md) |
| VCS | Connect to GitHub and show the code changes behind a video | [integrations/vcs.md](integrations/vcs.md) |
| API Token | The token the maintenance CLI and AI agents use | [api-token.md](api-token.md) |

---

## 4. Moving from `.env`

The integration and General settings used to be written in `.env`.
Those values are still read until you save the setting on the admin screen.

Once saved, the saved value is used and changing `.env` no longer has an effect.
The variables concerned are grouped under Deprecated in `.example.env`.
