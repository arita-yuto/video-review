---
title: "Admin Screen Guide"
sidebar:
  label: "Overview"
  order: 1
---
Administrators set up users, videos, integrations and the API token from Administration in the Web UI.
No need to edit `.env` or restart the server.

---

## 1. Register the first administrator

Right after deployment there are no users, so register the administrator from the Web UI.

1. Open the root URL in a browser (`http://localhost:3489` with Docker).
2. While nothing is initialized, the setup screen (`/bootstrap`) opens.
3. Enter an email address and a password (6 characters or more) and press Initialize.

<img src="/video-review/images/admin/register-administrator.webp" width="400" />

The user you register becomes an admin and stays logged in.

Note: there is no password reset screen, so keep the administrator's credentials safe.

---

## 2. Open Administration

1. Log in as an admin.
2. Press the gear icon at the bottom left.
3. Choose Administration.

The sections are listed on the left, and the selected one is shown on the right.
Only admins see Administration.

---

## 3. Sections

| Section | Details | Guide |
|---|---|---|
| General | Guest login, the login screen's default tab, the URL scheme, resolution presets, the upload chunk size | [general.md](/video-review/admin/general/) |
| Users | List users, create them, change roles | [users.md](/video-review/admin/users/) |
| Videos | List videos, delete videos or revisions | [videos.md](/video-review/admin/videos/) |
| Jira | Connect to Jira, create issues from comments | [integrations/issue-tracker.md](/video-review/admin/integrations/issue-tracker/) |
| SSO (OIDC) | Connect an identity provider such as OneLogin, sign in with SSO | [integrations/sso.md](/video-review/admin/integrations/sso/) |
| Slack / Webhook / Email | Where comments are announced | [integrations/notify.md](/video-review/admin/integrations/notify/) |
| AI / MCP | The LLM provider, chat search, AI agents | [AI Features Guide](/video-review/features/ai/) |
| VCS | Connect to GitHub and show the code changes behind a video | [integrations/vcs.md](/video-review/admin/integrations/vcs/) |
| API Token | The token the maintenance CLI and AI agents use | [api-token.md](/video-review/admin/api-token/) |
