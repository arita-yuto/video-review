# 🐳 Build & Run Guide (Docker)

How to run VideoReview with Docker.  
Use this for production or any container-based deployment.

The images are published to ghcr.io for every GitHub release, so there is nothing to build.

---

## 1. Create `.env`

```bash
cp .example.env .env
```

Two entries concern Docker:

| Variable | Meaning |
|---|---|
| `DOCKER_HOST_STORAGE` | The host path that holds the uploaded files. Empty keeps them in a Docker named volume |
| `VIDEO_REVIEW_VERSION` | The release to run (e.g. `v0.2.0`). Empty pulls the latest release |

---

## 2. Start

```bash
# 1. Pull the published images
docker compose -f compose.prod.yml pull

# 2. Start the DB
docker compose -f compose.prod.yml up -d db

# 3. Set up the DB (the first time, and whenever the schema changes)
docker compose -f compose.prod.yml run --rm videoreview npm run prisma:deploy

# 4. Start the services
docker compose -f compose.prod.yml up -d
```

Open `http://localhost:3489` and register the first administrator ([Admin Screen Guide](../admin/README.md)).

---

## 3. Update

```bash
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml run --rm videoreview npm run prisma:deploy
docker compose -f compose.prod.yml up -d
```

Note: when `VIDEO_REVIEW_VERSION` pins a release, raise it in `.env` first.

---

## Reference

### Build from source

To build locally instead of pulling, tag the images with the names compose refers to.  
Then continue from step 2 of "Start" (no `pull` needed).

```bash
docker build -t ghcr.io/arita-yuto/video-review/videoreview:latest -f docker/web/Dockerfile.prod .
docker build -t ghcr.io/arita-yuto/video-review/video-processing:latest -f docker/video-processing/Dockerfile .
```

### Development (Docker)

```bash
npm install
docker compose up -d --build
```
