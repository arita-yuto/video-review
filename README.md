<div align="center">

  <h1>VideoReview</h1>

  <p>
    Frame.io for game teams, running on your own storage.
  </p>

  <p>
    <a href="https://github.com/arita-yuto/video-review/blob/main/README.jp.md"><img alt="日本語 README" src="https://img.shields.io/badge/README-日本語-ff69b4?style=for-the-badge" /></a>
  </p>

  <p>
    <a href="https://github.com/arita-yuto/video-review/stargazers"><img src="https://img.shields.io/github/stars/arita-yuto/video-review?style=social" alt="GitHub stars" /></a>
    &nbsp;&nbsp;
    <a href="https://github.com/arita-yuto/video-review/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  </p>

  <img src="https://github.com/user-attachments/assets/77a85359-9e3a-4b62-8ee5-27c9b18557d4" alt="VideoReview: find a video, comment, draw on the frame, and compare revisions" width="880" />

</div>

## Review

<table>
  <tr>
    <td width="50%" valign="top">
      <b>Draw right on the video</b><br/>
      Draw on the paused frame instead of describing the spot in words.<br/><br/>
      <img src="docs/public/images/home/draw-on-frame-animated.webp" width="400" alt="Drawing on a paused frame" />
    </td>
    <td width="50%" valign="top">
      <b>Compare revisions</b><br/>
      Spot what a graphics update changed at a glance.<br/><br/>
      <img src="docs/public/images/home/compare-revisions.webp" width="400" alt="Two revisions side by side with the diff image below" />
    </td>
  </tr>
  <tr>
    <td colspan="2" valign="top">
      <b>Watch together</b><br/>
      Without screen sharing, everyone who opens the link plays, pauses and seeks in step.<br/><br/>
      <img src="docs/public/images/home/synced-playback-animated.webp" width="820" alt="Play and pause in step across two browsers" />
    </td>
  </tr>
</table>

## Built for game development

<table>
  <tr>
    <td width="33%" valign="top">
      <b>See what changed in the code</b><br/>
      See which update caused a change in the video, right in the browser.<br/><br/>
      <img src="docs/public/images/home/changes-tab.webp" width="260" alt="The Changes tab listing pull requests and commits" />
    </td>
    <td width="33%" valign="top">
      <b>Unity / Unreal Engine</b><br/>
      Open the scene from the video under review and check it in the editor right away.<br/><br/>
      <img src="docs/public/images/features/editor/open-scene-animated.webp" width="260" alt="Opening the scene in the editor" />
    </td>
    <td width="33%" valign="top">
      <b>Slack / Jira</b><br/>
      Keep comments from being left behind: post them to Slack, or turn them into tasks in one click.<br/><br/>
      <img src="docs/public/images/home/slack-jira-animated.webp" width="260" alt="Sending a comment to Slack and Jira" />
    </td>
  </tr>
</table>

**Runs on-premise**: review unreleased footage without it leaving your network (S3 and Nextcloud work too).  
**Also**: search · [AI chat search](https://arita-yuto.github.io/video-review/features/ai/#2-use-chat-search-in-the-app) · [MCP](https://arita-yuto.github.io/video-review/features/ai/#3-search-from-ai-agents) · [maintenance CLI](https://arita-yuto.github.io/video-review/features/maintenance-cli/)

## Quick Start (Docker)

```bash
mkdir video-review
cd video-review
curl -L -O https://raw.githubusercontent.com/arita-yuto/video-review/main/compose.prod.yml
docker compose -f compose.prod.yml up -d
```

Open http://localhost:3489 and register the first administrator.

## Documentation

### Run

- [Docker guide](https://arita-yuto.github.io/video-review/install/docker/)
- [Local / On‑premise guide](https://arita-yuto.github.io/video-review/install/local/)
- [https guide](https://arita-yuto.github.io/video-review/install/https/)

### Settings & integrations

- [Admin screen guide](https://arita-yuto.github.io/video-review/admin/)
- [AI features guide](https://arita-yuto.github.io/video-review/features/ai/)
- [Editor integration guide](https://arita-yuto.github.io/video-review/features/editor/)
- [VCS integration](https://arita-yuto.github.io/video-review/admin/integrations/vcs/)

## Support · Contributing · License

- Stuck on setup or connecting your tools? Just ask! videoreview.contact.info@gmail.com
- See [CONTRIBUTING.md](./CONTRIBUTING.md).
- MIT License.
