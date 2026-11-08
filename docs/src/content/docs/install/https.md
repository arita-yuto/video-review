---
title: "https guide"
sidebar:
  label: "https"
  order: 3
---
How to put nginx in front of VideoReview and serve it at `https://<server name>/`.

Note: if you already have a certificate issued by a CA, start from "Place the certificate".

---

## 1. Prepare a server name and a certificate

- A server name that users' browsers reach the VideoReview server by (such as `videoreview.example.com`)
- A certificate for that name (PEM, with any intermediate certificates appended)
- The certificate's private key (PEM)

### Create a self-signed certificate

If you have no CA-issued certificate, create one with your server name:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -subj "/CN=videoreview.example.com" \
  -addext "subjectAltName=DNS:videoreview.example.com" \
  -keyout privkey.pem -out fullchain.pem
```

Note: browsers warn about a self-signed certificate, since no known CA issued it.

---

## 2. Place the certificate

Create `certs/` and put the certificate and the key there under these names (with Docker, in the same folder as `compose.prod.yml`):

```
certs/fullchain.pem
certs/privkey.pem
```

---

## 3. Start nginx

### Docker

Start with the `https` profile:

```bash
docker compose -f compose.prod.yml --profile https up -d
```

### Local / On‑premise

Install nginx on the same server as VideoReview and use `docker/nginx/videoreview.conf` as its config file
(on Linux, `/etc/nginx/conf.d/videoreview.conf`).

Set the `upstream` at the top of the file to the VideoReview on the same server:

```nginx
upstream videoreview {
    server 127.0.0.1:3489;
}
```

Also change the certificate paths (`/etc/nginx/certs/fullchain.pem` and `privkey.pem`) to where you placed `certs/`.

Restart nginx.

### Verify

Open `https://<server name>/` in a browser. If the login screen appears, the setup is complete.

Note: if you use a reverse proxy other than nginx, make it pass `X-Forwarded-Proto` and `X-Forwarded-Host` to VideoReview.  
Also turn off response buffering there (nginx: `proxy_buffering off`), or the review screen's live stream (participant count, synced playback) is held back.
