# API Token

The token the maintenance CLI and AI agents use to call the REST API.
There is one token, and it has the same rights as an admin.

<img src="image of API Token goes here">

## 1. Issue it

1. Press Generate (Regenerate if one exists).
2. Copy the token with Ctrl+C.
3. Store it somewhere safe.

Note: the token is shown only at this moment.  
Note: if it is lost, issue it again.  
Note: only one token can exist, so the old one stops working the moment you regenerate.

## 2. Where it is used

| Where | How |
|---|---|
| Maintenance CLI | Set it up as described in the [maintenance CLI guide](../../maintenance/README.md) |
| AI agents | Pass it in the `x-api-token` header, as described under "Use from an AI agent" in the [AI Features Guide](../build.run/ai-guide.md) |
| curl | Put it in the `x-api-token` header (the API is listed at `/api/docs`) |
