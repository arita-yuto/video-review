# General

Settings for the login screen and for how videos are handled.
There is nothing to connect to, so Save stores the values as they are and they apply from the next page load.

<img src="image of General goes here">

## 1. Configure

| Field | Meaning | Default |
|---|---|---|
| Guest login | Off removes the Guest tab from the login screen, and the server refuses guest logins too | On |
| Default login tab | The tab the login screen opens on (Guest / JIRA / Email & Password) | Guest |
| URL scheme | The link the Open Scene button opens (`{scenePath}` is replaced with the video's scene path); empty hides the button | `videoreview://open?scene={scenePath}` (what the bundled launcher registers) |
| Resolution presets | Widths in pixels of the downscaled variants made by video processing, comma-separated (e.g. `480,720,1080`); empty makes none | empty |
| Upload chunk (MB) | The size of one chunk of a video upload; lower it when a proxy in front of the server rejects bodies of that size | 16 |

Note: Resolution presets apply to videos processed from now on (variants of already processed videos are not remade).  
Note: with S3 as the storage the file is sent directly, so Upload chunk is not used.
