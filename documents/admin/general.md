# General

Settings for the login screen and for how videos are handled.
There is nothing to connect to, so Save stores the values as they are and they apply from the next page load.

---

## 1. Open

Open Administration → General.

---

## 2. Configure

| Field | Meaning | Default |
|---|---|---|
| Guest login | Off removes the Guest tab from the login screen, and the server refuses guest logins | On |
| Default login tab | The tab the login screen opens on (Guest / JIRA / Email & Password) | Guest |
| URL scheme | The link the Open Scene button opens; `{scenePath}` is replaced with the video's scene path, and an empty value hides the button | `videoreview://open?scene={scenePath}` (what the bundled launcher registers) |
| Resolution presets | Widths in pixels of the downscaled variants the video processing makes, separated by commas, e.g. `480,720,1080`; empty makes none | empty |
| Upload chunk (MB) | The size of one chunk of a video upload; lower it when a proxy in front of the server refuses bodies of that size | 16 |

1. Change the values.
2. Press Save.

- When Guest is the default tab and guest login is off, the login screen opens on Email & Password.
- Resolution presets apply to videos processed from now on; variants of already processed videos are not remade.
- With S3 as the storage, the upload chunk must be 5 or more.
- The maintenance CLI receives the same chunk size, so there is nothing to set on the CLI side.

---

## 3. Moving from `.env`

These variables are read until you save on the admin screen:

- `VIDEO_REVIEW_ALLOW_GUEST` (`NEXT_PUBLIC_VIDEO_REVIEW_ALLOW_GUEST` is treated the same; `false` under either turns guest login off)
- `NEXT_PUBLIC_VIDEO_REVIEW_LOGIN_DEFAULT_TYPE`
- `NEXT_PUBLIC_VIDEO_REVIEW_URL_SCHEMA`
- `NEXT_PUBLIC_VIDEO_REVIEW_RESOLUTION_PRESETS`
- `VIDEO_REVIEW_UPLOAD_CHUNK_MB`

Save stores every field, including the values that came from `.env`.
From then on `.env` has no effect; change the values on the admin screen.
