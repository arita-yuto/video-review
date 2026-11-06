# 🐳 Build & Run Guide (Docker)

How to run VideoReview with Docker.  
Use this for production or any container-based deployment.

The images are published to ghcr.io for every GitHub release, so there is nothing to build.  
The same images are on Docker Hub as [aritayuto/videoreview](https://hub.docker.com/r/aritayuto/videoreview) and [aritayuto/video-processing](https://hub.docker.com/r/aritayuto/video-processing); `compose.prod.yml` pulls from ghcr.io.

Note: Docker Compose 2.24 or later is required (check with `docker compose version`).

---

## 1. Start

```bash
mkdir video-review
cd video-review
curl -L -O https://raw.githubusercontent.com/arita-yuto/video-review/main/compose.prod.yml
docker compose -f compose.prod.yml up -d
```

Open `http://localhost:3489` and register the first administrator ([Admin Screen Guide](../admin/README.md)).

---

## 2. Update

```bash
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

---

## 3. Pin the storage path or the version

Only when you need to, create a `.env` in the same folder as `compose.prod.yml`.

| Variable | Meaning |
|---|---|
| `DOCKER_HOST_STORAGE` | The host path that holds the uploaded files. Empty keeps them in a Docker named volume |
| `VIDEO_REVIEW_VERSION` | The release to run (e.g. `v0.2.0`). Empty pulls the latest release |

---

## Reference

### Run it all with video-review-cli

With `video-review-cli` downloaded into the same folder as `compose.prod.yml`, the update steps run in one command.

```bash
# Linux
curl -L -o video-review-cli https://github.com/arita-yuto/video-review/releases/latest/download/video-review-cli-linux-amd64
chmod +x video-review-cli

# Windows
curl.exe -L -o video-review-cli.exe https://github.com/arita-yuto/video-review/releases/latest/download/video-review-cli-windows-amd64.exe

# Update
./video-review-cli upgrade --docker
```

Start and stop with `./video-review-cli start --docker` / `stop --docker`.

### Build from source

To build locally instead of pulling, tag the images with the names compose refers to.

```bash
docker build -t ghcr.io/arita-yuto/video-review/videoreview:latest -f docker/web/Dockerfile.prod .
docker build -t ghcr.io/arita-yuto/video-review/video-processing:latest -f docker/video-processing/Dockerfile .
```

### Development (Docker)

```bash
npm install
docker compose up -d --build
```
