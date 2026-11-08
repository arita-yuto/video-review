---
title: "API Token"
sidebar:
  order: 6
---
The token the maintenance CLI and AI agents use to call the REST API.
There is one token, and it has the same rights as an admin.

<img src="/video-review/images/admin/api-token/api-token-section.webp" />

## 1. Generate the token

1. Press Generate (Regenerate if one exists).
2. Copy the token with Ctrl+C.
3. Store it somewhere safe.

Note: the token is shown only at this moment.  
Note: if it is lost, issue it again.  
Note: only one token can exist, so the old one stops working the moment you regenerate.

## 2. Use the token

| Where | How |
|---|---|
| Maintenance CLI | Set it up as described in the [maintenance CLI guide](/video-review/features/maintenance-cli/) |
| AI agents | Pass it in the `x-api-token` header, as described under "Search from AI agents" in the [AI Features Guide](/video-review/features/ai/) |
| curl | Put it in the `x-api-token` header (the API is listed at `/api/docs`) |
