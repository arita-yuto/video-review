<div align="center">

  <h1>VideoReview</h1>

  <p>
    Frame.io for game teams, running on your own storage.
  </p>

  <p>
    <a href="./README.jp.md"><img alt="日本語 README" src="https://img.shields.io/badge/README-日本語-ff69b4?style=for-the-badge" /></a>
  </p>

  <p>
    <a href="https://github.com/arita-yuto/video-review/stargazers"><img src="https://img.shields.io/github/stars/arita-yuto/video-review?style=social" alt="GitHub stars" /></a>
    &nbsp;&nbsp;
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  </p>

  <img src="https://github.com/user-attachments/assets/f20801d1-845d-4279-9c57-aca98e9bc16c" alt="VideoReview: comment, draw on the frame, and compare revisions" width="880" />

</div>

## Review

<table>
  <tr>
    <td width="50%" valign="top">
      <b>Draw right on the video</b><br/>
      Draw on the paused frame instead of describing the spot in words.<br/><br/>
      <img src="https://github.com/user-attachments/assets/caf847d0-be43-4d89-b843-600b733a0731" width="400" alt="Drawing on a paused frame" />
    </td>
    <td width="50%" valign="top">
      <b>Compare revisions</b><br/>
      Spot what a graphics update changed at a glance.<br/><br/>
      <img src="https://github.com/user-attachments/assets/8fd74149-bea6-492d-b789-30f4c23e7ba1" width="400" alt="Two revisions side by side with the diff image below" />
    </td>
  </tr>
</table>

## Built for game development

<table>
  <tr>
    <td width="33%" valign="top">
      <b>See what changed in the code</b><br/>
      See which update caused a change in the video, right in the browser.<br/><br/>
      <img src="https://github.com/user-attachments/assets/a282f05e-ff74-4406-948d-6cdf9ae27181" width="260" alt="The Changes tab listing pull requests and commits" />
    </td>
    <td width="33%" valign="top">
      <b>Unity / Unreal Engine</b><br/>
      Open the scene from the video under review and check it in the editor right away.<br/><br/>
      <img src="https://github.com/user-attachments/assets/b9c84fbc-a0a4-49ad-b038-1ee4d376fcd7" width="260" alt="Opening the scene in the editor" />
    </td>
    <td width="33%" valign="top">
      <b>Slack / Jira</b><br/>
      Keep comments from being left behind: post them to Slack, or turn them into tasks in one click.<br/><br/>
      <img src="https://github.com/user-attachments/assets/d5a23dba-b83b-4927-b202-a0079e339755" width="260" alt="Sending a comment to Slack and Jira" />
    </td>
  </tr>
</table>

**Runs on-premise**: review unreleased footage without it leaving your network (S3 and Nextcloud work too).  
**Also**: search · [AI chat search](./documents/build.run/ai-guide.md#2-use-chat-search-in-the-app) · [MCP](./documents/build.run/ai-guide.md#3-use-it-from-ai-agents) · [maintenance CLI](./maintenance/README.md)

## Quick Start (Docker)

```bash
git clone --depth 1 https://github.com/arita-yuto/video-review.git
cd video-review
docker compose -f compose.prod.yml up -d
```

Open http://localhost:3489 and register the first administrator.

## Documentation

### Run

- [Docker guide](./documents/build.run/docker-guide.md)
- [Local / On‑premise guide](./documents/build.run/local-guide.md)

### Settings & integrations

- [Admin screen guide](./documents/admin/README.md)
- [AI features guide](./documents/build.run/ai-guide.md)
- [Editor integration guide](./documents/integrations/editor-guide.md)
- [VCS integration](./documents/admin/integrations/vcs.md)

## Support · Contributing · License

- Stuck on setup or connecting your tools? Just ask! videoreview.contact.info@gmail.com
- See [CONTRIBUTING.md](./CONTRIBUTING.md).
- MIT License.
