# API Token

The token the maintenance CLI and AI agents use to call the REST API.
There is one token and it has the same rights as an admin.

---

## 1. Open

Open Administration → API Token.
It shows Configured or Not configured.

---

## 2. Issue it

1. Press Generate (Regenerate when one exists).
2. Copy the token with Ctrl+C.
3. Store it somewhere safe.

The token is shown only at this moment.
When it is lost, press Regenerate; the old token stops working at that point.

---

## 3. Use it

| Where | How |
|---|---|
| Maintenance CLI | Follow the [maintenance CLI guide](../../maintenance/README.md) |
| AI agents | Pass it in the `x-api-token` header as described under "Use from an AI agent" in the [AI Features Guide](../build.run/ai-guide.md) |
| Your own scripts | Put it in the `x-api-token` header; the API is listed at `/api/docs` |
