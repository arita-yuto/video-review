<!-- HERO -->
<div align="center">

  <h1>VideoReview</h1>

  <p>
    A self-hosted video review hub for small-to-mid teams.
    <br/>
    Comment on timelines, draw on frames, and connect feedback to action.
  </p>

  <!-- Buttons -->
  <p>
    <a href="./README.jp.md">
      <img alt="日本語 README" src="https://img.shields.io/badge/README-日本語-ff69b4?style=for-the-badge" />
    </a>
  </p>

  <p align="center">
    <a href="https://github.com/arita-yuto/video-review/stargazers">
      <img src="https://img.shields.io/github/stars/arita-yuto/video-review?style=social" alt="GitHub stars" />
    </a>
    &nbsp;&nbsp;
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
    </a>
  </p>
</div>
<hr/>

<!-- One-liner + bullets -->
<h3>What it is</h3>

<p>
  VideoReview helps teams go beyond just “watching” review videos.
  Upload videos, leave timeline comments, draw directly on frames,
  and connect feedback to action.
</p>

<p>
  It integrates with <b>Slack</b> and <b>Jira</b>,
  and is designed to be extended to fit into existing production workflows.
</p>

<ul>
  <li><b>Workflow integrations</b> — Slack, Jira (more to come)</li>
  <li><b>Extensible by design</b> — built to fit into existing pipelines</li>
  <li><b>Engine / tool agnostic</b> — not tied to a single platform</li>
</ul>

<!-- Screenshot -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/532f55eb-0f47-45aa-b17c-2e7a8bb5e191" alt="VideoReview screenshot" width="1280" />
</p>

## Need help setting it up?

We can help with on-premise setups and integrations with existing tools.  
If you'd like support, feel free to reach out:

videoreview.contact.info@gmail.com

## 🤝 Contributing

We want more people to use VideoReview, and we'd love to build it together as OSS.  
Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for how to get involved.

## ✨ Key Features

### Flexible Deployment: On‑premise or Cloud
**Review confidential videos without sending them outside your network.**

VideoReview is designed with on-premise operation in mind, allowing teams to review confidential footage securely inside their internal network.

Depending on your needs, you can also choose:
- AWS S3
- NextCloud

---

### Actionable Comment Panel
**Turn video comments into clear, actionable feedback.**

The comment list is designed with a social‑style, intuitive UI:

- Comments with drawings
- Comments linked to tickets
- New comments

Badges and color cues highlight what needs action at a glance.

#### Draw on the frame

<img src="https://github.com/user-attachments/assets/47c65756-c12c-40f6-b67b-c826a5d021d0" width="700" />

Instead of describing a spot in words, draw on the frame itself.

1. Pause the video and post a comment.
2. Choose Edit from that comment's menu; the video becomes a canvas.
3. Use the tools at the top left to switch between pen and eraser and pick the width and color.
4. Save the comment. The drawing is attached to it and shows up at the same time during playback.

### Never Miss Feedback with Slack & Jira

**Make feedback visible where your team already works.**

Reviews should not end at “watching”.  
By integrating with Slack and Jira, VideoReview turns review feedback into part of your existing workflow,
so comments naturally lead to discussion and action.

---

#### Slack & Jira Integration

<img src="https://github.com/user-attachments/assets/d5a23dba-b83b-4927-b202-a0079e339755" width="700" />

From the review timeline, comments can be shared to Slack or converted into Jira issues,
keeping feedback actionable without switching tools.

---

#### Unity Auto-Open via Custom Protocol

<img src="https://github.com/user-attachments/assets/b9c84fbc-a0a4-49ad-b038-1ee4d376fcd7" width="700" />

Open the relevant Unity scene or asset directly from a reviewed video,
so feedback naturally leads into the next step of work.

# ✨ Advanced Features
### Powerful Search for Review Workflow

Videos, comments and events each have their own search:

- Videos: has comments, has a ticket or a drawing, comment author, text, comment date, video update date
- Comments: text, date, has a drawing or a ticket, author
- Events: the text of a line or a caption, the kind, has a link

Queries like "videos A drew on last week" or "videos where this line is spoken" are just a few filters combined.  
From day-to-day reviews to later retrospectives, the right info is always close.

<img src="https://github.com/user-attachments/assets/cccd3a3c-2d50-4963-85a5-6659d4a6b972" width="700" />

### Ask in Plain Language: AI Chat Search

Instead of building a query, just ask:

- "Which videos got the most reviews last month?"
- "Which videos still have unresolved feedback?"
- "What changed in this revision?"

The AI answers across videos, comments, events and code changes.

<img src="https://github.com/user-attachments/assets/82679465-046f-45c4-94cf-40b8bb8dc41b" width="50%" />

The same search is exposed over MCP, so AI agents such as Claude Code, Codex CLI or Gemini CLI can ask VideoReview too.

The LLM can be Claude, OpenAI or Gemini, or Ollama for a fully local setup ([AI Features Guide](./documents/build.run/ai-guide.md)).

### See the Code Behind Every Revision

With a repository connected, the Changes tab in a video's side panel lists the commits and pull requests that landed between the previous revision and this one.

- Only changes that touched the paths tied to the video are shown; low-relevance ones stay folded
- With the AI features on, a summary of the changes appears as well

<img src="https://github.com/user-attachments/assets/ebe41883-3720-4b3f-9bc1-3177e36f3bbd" width="320" />

Trace "which change caused this" without leaving the review screen ([VCS settings](./documents/admin/integrations/vcs.md)).

### Built for Production Pipelines

Designed to fit into real production workflows.

- A maintenance CLI for admins (user management and data operations)  
  See: [maintenance README](./maintenance/README.md)
- Upload videos via API from DCC tools, automated tests, or CI

For example, videos can be uploaded from scripts or pipelines with a single command:

```bash
go run . upload-video \
  --title "title" \
  --folder_key "folder_key" \
  --scene_path "scene_path" \
  --video_path "/path/to/video.mp4"
```

## Roadmap

VideoReview aims to stay useful in real production environments and will evolve step by step.

Guiding ideas are:

- On‑premise‑first design and operations
- Integrations that fit naturally into existing workflows
- Review as a path to the next action
- Pipeline integration and automation

---

## Getting Started

### Quick Start (Docker)

```bash

# 1. Copy .env
cp .example.env .env

# 2. Pull the published images
docker compose -f compose.prod.yml pull

# 3. Run only DB
docker compose -f compose.prod.yml up -d db

# 4. Run prisma deploy (just once, for initial setup or schema changes)
docker compose -f compose.prod.yml run --rm videoreview npm run prisma:deploy

# 5. Run the services
docker compose -f compose.prod.yml up -d

```

### Access

- Web UI  
  http://localhost:3489

- API Documentation (Swagger)  
  http://localhost:3489/api/docs

### First Launch

On first access the Web UI asks you to register an administrator.
Users, videos, integrations and the API token are then managed from Administration in the Web UI.

See the [Admin Screen Guide](./documents/admin/README.md) for the steps.

---

## 📘 More Setup Options

For detailed instructions, see:
* [Docker Prod / Devlopment Build Guide](./documents/build.run/docker-guide.md)
* [Local / On‑premise Build Guide](./documents/build.run/local-guide.md)
* [AI Features Guide](./documents/build.run/ai-guide.md)
* [Admin Screen Guide](./documents/admin/README.md)

## License

This project is licensed under the **MIT License**.
