# VideoReview

Frame.io for game teams, running on your own storage.

<img src="https://arita-yuto.github.io/video-review/images/home/review-demo-animated.webp" alt="VideoReview: find a video, comment, draw on the frame, and compare revisions" width="880" />

- **Draw right on the video**: draw on the paused frame instead of describing the spot in words.
- **Compare revisions**: spot what a graphics update changed at a glance.
- **See what changed in the code**: see which code changes caused a difference in the video, right in the browser.
- **Unity / Unreal Engine**: open the scene from the video you're reviewing straight in the editor.
- **Slack / Jira**: post comments to Slack, or turn them into Jira issues in one click.
- **Runs on-premise**: keep unreleased footage inside your own network. S3 and Nextcloud storage are also supported.

## Quick start

This image is the web app. It needs [aritayuto/video-processing](https://hub.docker.com/r/aritayuto/video-processing) and PostgreSQL, and `compose.prod.yml` starts all three from Docker Hub.

```bash
mkdir video-review
cd video-review
curl -L -o compose.prod.yml https://github.com/arita-yuto/video-review/releases/latest/download/compose.dockerhub.yml
docker compose -f compose.prod.yml up -d
```

Open http://localhost:3489 and register the first administrator.

## Update

```bash
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

## Tags

| Tag | Description |
|---|---|
| `vX.Y.Z` | A release, such as `v0.15.1` |
| `latest` | The latest release; release candidates (`vX.Y.Z-rc.N`) never move it |

## Links

- [GitHub](https://github.com/arita-yuto/video-review)
- [Docs](https://arita-yuto.github.io/video-review/)
- [Docker guide](https://arita-yuto.github.io/video-review/install/docker/)
- [Admin screen guide](https://arita-yuto.github.io/video-review/admin/)
- [MIT License](https://github.com/arita-yuto/video-review/blob/main/LICENSE)
