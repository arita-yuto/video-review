# AI Features Guide

AI features are optional. Once enabled, you get the AI summary in the VCS Code Changes panel and chat search.

---

## 1. Configure an LLM provider

### Choose a provider

| | Claude / ChatGPT / Gemini | Ollama (local) |
|---|---|---|
| Privacy | Video titles, comments and PR data are sent to the provider | Fully local, nothing leaves your network |
| Accuracy | High | Depends on the model |
| Cost | Per token | Free (hardware only) |
| Setup | API key only (when used from the VideoReview web app) | Run Ollama and download a model |
| Chat search | Works | Needs a model with reliable tool calling (`llama3.1:8b` failed in our check) |
| Suited for | Production, teams | Local and offline environments |

### Common settings

Add to `.env`:

```env
# "claude" / "openai" / "gemini" / "ollama"
VIDEO_REVIEW_LLM_PROVIDER=claude

# Model name
# Claude:  claude-haiku-4-5-20251001 / claude-sonnet-4-6
# OpenAI:  gpt-5-mini / gpt-5
# Gemini:  gemini-2.0-flash
# Ollama:  llama3.1:8b / gemma3:12b
VIDEO_REVIEW_LLM_MODEL=claude-haiku-4-5-20251001
```

### Claude

```env
VIDEO_REVIEW_LLM_API_KEY=sk-ant-...
```

Get an API key at https://console.anthropic.com/

### OpenAI (ChatGPT)

```env
VIDEO_REVIEW_LLM_API_KEY=sk-...
```

Get an API key at https://platform.openai.com/

### Gemini

```env
VIDEO_REVIEW_LLM_API_KEY=AIza...
```

Get an API key at https://aistudio.google.com/

### Ollama

#### Docker

The Ollama container is defined in `compose.prod.ollama.yml`.

```bash
# 1. Start the Ollama container
docker compose -f compose.prod.yml -f compose.prod.ollama.yml up -d ollama

# 2. Download a model (once; it is kept in a Docker volume)
docker exec videoreview-ollama ollama pull llama3.1:8b
```

```env
VIDEO_REVIEW_LLM_BASE_URL=http://ollama:11434
VIDEO_REVIEW_LLM_MODEL=llama3.1:8b
```

#### Local / On‑premise

```bash
# 1. Install Ollama: https://ollama.com/download
# 2. Download a model (once; it is kept in ~/.ollama/models)
ollama pull llama3.1:8b
```

```env
VIDEO_REVIEW_LLM_BASE_URL=http://localhost:11434
VIDEO_REVIEW_LLM_MODEL=llama3.1:8b
```

## 2. Start the MCP server

The MCP server exposes tools that read VideoReview's videos, comments and code changes over MCP (Model Context Protocol).

### Issue an API token

In the VideoReview web UI, open Settings → Edit Profile (see the [Admin Guide](../admin-guide.md)).
The MCP server uses this token to call the VideoReview API.

### Docker

Add to `.env`:

```env
# The API token you issued
VIDEO_REVIEW_API_TOKEN=<API token>

# The URL people open VideoReview at in a browser (used for the links in answers)
VIDEO_REVIEW_PUBLIC_URL=http://videoreview.internal:3489
```

Start it:

```bash
# Development
docker compose -f compose.yml up -d --build mcp

# Production (no service name: the overlay also configures the web service)
docker build -t videoreview-mcp:latest -f docker/mcp/Dockerfile .
docker compose -f compose.prod.yml -f compose.prod.mcp.yml up -d
```

With Ollama, add `-f compose.prod.ollama.yml` as well:  
`docker compose -f compose.prod.yml -f compose.prod.mcp.yml -f compose.prod.ollama.yml up -d`

### Local / On‑premise

Add to `.env`:

```env
# The API token you issued
VIDEO_REVIEW_API_TOKEN=<API token>

# The URL people open VideoReview at in a browser (used for the links in answers)
VIDEO_REVIEW_PUBLIC_URL=http://videoreview.internal:3489

# The address the MCP server calls the VideoReview API at
VIDEO_REVIEW_SERVER_URL=http://localhost:3489
```

Build and start it:

```bash
npm run mcp:build
npm run mcp:run -- --http
```

The port defaults to 3490. For another port, add its number, as in `npm run mcp:run -- --http 4000`.  
Keep the `--`: without it npm takes `--http` for itself and the server starts on stdio.

### Check

The startup log shows this line:

```
MCP server listening on http://0.0.0.0:3490/mcp
```

## 3. Enable the in-app chat search

### Tell the web server where the MCP server is

With Docker there is nothing to set: `compose.yml` and `compose.prod.mcp.yml` already set it on the web service.

On Local / On‑premise, add to `.env`:

```env
VIDEO_REVIEW_MCP_URL=http://localhost:3490/mcp
```

### Check

Restart the web server and log in as an admin.
The chat icon appears in the video list header, next to the search icon.

If the icon is missing, open the settings from the gear icon at the bottom left.
The "AI search (chat)" row shows the reason (admins only).


## 4. Use it from an AI agent

Each person sets this up for their own agent.
The agent (Claude Code, Codex CLI, Gemini CLI, ...) connects to the MCP server you started.

No API token is needed here; the MCP server holds it.

### Register the server

Claude Code

```bash
claude mcp add --transport http video-review http://videoreview.internal:3490/mcp
```

Inside the VideoReview repository, skip the registration.
The repository's `.mcp.json` reads the `VIDEO_REVIEW_MCP_URL` environment variable, so set `export VIDEO_REVIEW_MCP_URL=http://videoreview.internal:3490/mcp` in your shell and approve the server when `claude` starts (first time only).

Codex CLI

```bash
codex mcp add video-review --url http://videoreview.internal:3490/mcp
```

Gemini CLI

```bash
gemini mcp add --transport http video-review http://videoreview.internal:3490/mcp
```

### Check

```bash
claude mcp list
codex mcp list
gemini mcp list
```

video-review is listed as connected.

### Ask

Ask in the agent's session, in plain words:

- "List the videos uploaded this week in VideoReview."
- "Which videos have comments with a drawing?"
- "What code changes are behind the latest revision of the dragon boss video?"

Video names in the answer are links that open in a browser.

---

## 5. Customize the search context

General context such as which tool answers which question and how dates are read ships with the server.
Team-specific context goes into a Markdown file that the MCP server reads.

### Write the notes

What tags mean, who owns which folder, how answers should look, how frequent questions are phrased, and so on:

```markdown
# Tags
- bug: QA has filed a ticket (the ticket id is in the comment)
- wip: not reviewed yet (exclude from "finished videos" questions)

# Folders
- 05_cutscene: owned by the cinematics team

# Answer format
- One line per video, with the link and the date of the latest revision
- "Recent" means the last two weeks

# Frequent questions
- "Waiting for review" means videos without the wip tag and with no comments
```

### Set the path and restart

Set the file path in the MCP server's `.env` and restart the MCP server:

```env
VIDEO_REVIEW_MCP_GUIDE_PATH=/srv/videoreview/team-notes.md
```

---

## Reference

### Tools

The tools the MCP server provides.
The assistant picks and calls them; people do not use them directly.

| Tool | Returns |
|---|---|
| `list_videos` | Videos, filtered by title, folder, tags, upload date and comment conditions |
| `get_video` | One video with all its revisions |
| `list_comments` | Review comments, filtered by text, user, date, drawing and issue link |
| `list_video_events` | Analysis events of one video (on-screen text, transcription, ...) |
| `search_videos_by_event` | Videos whose dialogue or captions contain a given text |
| `list_vcs_changes` | Pull requests and commits linked to a revision |
| `get_vcs_summary` | The AI summary of those code changes |
| `list_tags` | Every tag in use |
| `list_folders` | Every folder in use |

### Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Warning: VIDEO_REVIEW_API_TOKEN is not set` when the MCP server starts | `.env` is not being read, or the token is missing |
| Tools return `HTTP 401` | The token is wrong or revoked; issue a new one |
| Tools return `HTTP 404` or connection refused | The MCP server cannot reach the VideoReview API (on Local / On‑premise, check `VIDEO_REVIEW_SERVER_URL`) |
| Links in answers do not open in a browser | `VIDEO_REVIEW_PUBLIC_URL` is not set |
| An agent cannot connect to the MCP server | The registered URL is wrong, or the server is unreachable (for Claude Code inside the repository: `VIDEO_REVIEW_MCP_URL` is missing in the shell you started it from) |
| `list_vcs_changes` asks for `from` | The first revision has nothing to compare with; open the VCS panel for that video once, or ask about a later revision |
