---
title: "Video Processing Guide"
sidebar:
  label: "Video processing"
  order: 5
---
After a video is uploaded, the worker (`video-processing`) makes its thumbnail and lower-resolution copies.  
This guide shows how to process many waiting videos at once with `run-once`.

---

## 1. Check the count in the admin account menu

When videos are waiting, the account menu of an admin shows how many.

<img width="660" src="/video-review/images/features/video-processing/account-menu.webp" />

Note: the count is refreshed each time the menu opens.

---

## 2. Process the waiting videos with run-once

`run-once` processes every waiting video, then exits.  
It can run alongside a worker that is already running.

##### To finish sooner
Run it on the server that runs the worker, or on another machine.

##### With S3 + Lambda
The Lambda only processes videos as they are uploaded.  
Videos that an upgrade queued for re-encoding are processed by `run-once`.

### Docker

Run it in the folder that holds `compose.prod.yml`.

```bash
docker compose -f compose.prod.yml run --rm video-processing npm run video-processing:run-once
```

With S3 + Lambda, run it in a folder that holds a `.env` with the same settings as the web server.

```bash
docker run --rm --env-file .env ghcr.io/arita-yuto/video-review/video-processing npm run video-processing:run-once
```

Note: do not wrap values in `"` in a `.env` passed with `--env-file`.

### Local / On‑premises

Run it in the install folder.

```bash
./video-review-cli run-once
```

---

## 3. Re-encode a failed video with reencode-video

A video whose lower-resolution copies could not be made is queued again with the maintenance CLI ([Maintenance CLI guide](/video-review/features/maintenance-cli/)).

> go run . reencode-video --video_id {uuid}
