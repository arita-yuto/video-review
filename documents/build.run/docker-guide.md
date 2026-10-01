# 🐳 Build & Run Guide (Docker)

How to run VideoReview with Docker.  
Use this for production or any container-based deployment.

The images are published to ghcr.io for every GitHub release, so there is nothing to build.

Note: Docker Compose 2.24 or later is required (check with `docker compose version`).

---

## 1. Start

```bash
git clone --depth 1 https://github.com/arita-yuto/video-review.git
cd video-review
docker compose -f compose.prod.yml up -d
```

Open `http://localhost:3489` and register the first administrator ([Admin Screen Guide](../admin/README.md)).

---

## 2. Update

```bash
git pull
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

---

## 3. Pin the storage path or the version

Only when you need to, create a `.env` at the root of the repository.

| Variable | Meaning |
|---|---|
| `DOCKER_HOST_STORAGE` | The host path that holds the uploaded files. Empty keeps them in a Docker named volume |
| `VIDEO_REVIEW_VERSION` | The release to run (e.g. `v0.2.0`). Empty pulls the latest release |

---

## Reference

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
