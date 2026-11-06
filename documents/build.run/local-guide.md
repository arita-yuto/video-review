# 💻 Build & Run Guide (Local / On‑premise)

How to run VideoReview directly on a server, without Docker.  
`video-review-cli` installs and runs the zip published with each release.

Note: the zip is built for Linux (x64) and Windows (x64).

---

## 1. Prepare

- Node v24
- PostgreSQL
- ffmpeg (used to convert videos; put the `ffmpeg` command on PATH)

---

## 2. Install

Create the install folder and work in it.

### Download video-review-cli and .env

```bash
# Linux
curl -L -o video-review-cli https://github.com/arita-yuto/video-review/releases/latest/download/video-review-cli-linux-amd64
chmod +x video-review-cli

# Windows
curl.exe -L -o video-review-cli.exe https://github.com/arita-yuto/video-review/releases/latest/download/video-review-cli-windows-amd64.exe

# Linux / Windows
curl -L -o .env https://raw.githubusercontent.com/arita-yuto/video-review/main/.example.env
```

### Edit .env

Please specify the server where PostgreSQL is running.

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/videoreview"
```

In local (non-Docker) environments, it is strongly recommended to explicitly set:

```bash
VIDEO_REVIEW_LOCAL_ROOTDIR="/path/.../..."
```

If `VIDEO_REVIEW_LOCAL_ROOTDIR` is not set or is invalid, the application falls back to
`process.cwd()/uploads` to store uploaded video files.

This fallback behavior is **not suitable for production use or long-term storage**
for the following reasons:

- Files may be lost during application updates or redeployment
- The storage location may be unclear
- Backups and capacity planning become difficult

### Install and start

```bash
./video-review-cli upgrade
```

This installs the latest release and starts the web and the worker.  
It is done when `… is running` appears.

Open `http://localhost:3489` and register the first administrator ([Admin Screen Guide](../admin/README.md)).

---

## 3. Start and stop

```bash
./video-review-cli start
./video-review-cli stop
```

The web and the worker run in the background, and their logs go to `logs`.  
After the OS restarts, start them with `start`.

---

## 4. Update

```bash
./video-review-cli upgrade
```

This installs the latest release and replaces the web, the worker and `video-review-cli`.  
If it does not start, the previous release runs again.

You can also update from the admin screen ([General](../admin/general.md)).

---

## Reference

### What the folder holds

| Name | Meaning |
|---|---|
| `video-review-cli` | The CLI of the latest release |
| `.env` | Settings |
| `secrets` | The encryption key (without it, saved tokens can no longer be read) |
| `uploads` | Uploaded files (when `VIDEO_REVIEW_LOCAL_ROOTDIR` is empty) |
| `releases` | Unpacked releases (the running one and the two newest are kept) |
| `current` | The running release |
| `run` | Process IDs of the running web and worker |
| `logs` | `web.log`, `worker.log`, `upgrade.log` |

### Move VideoReview to another folder

1. Stop the current server.
2. Download `video-review-cli` into the new folder ([Download](#download-video-review-cli-and-env); skip `.env`).
3. Move `.env`, `secrets` and `uploads` from the current folder to the new one.
4. Run `./video-review-cli upgrade` in the new folder.

Note: `uploads` exists only if `VIDEO_REVIEW_LOCAL_ROOTDIR` was not set.

### Build and run from source

```bash
cp .example.env .env      # set DATABASE_URL
npm install
npm run prisma:deploy
npm run build
npm run start
```
