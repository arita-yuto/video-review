# VCS

With a repository connected, the Changes tab of a video's side panel shows the commits and pull requests tied to that revision.
With the AI features on, it shows a summary of them too ([AI Features Guide](../../build.run/ai-guide.md)).

<img src="https://github.com/user-attachments/assets/65bb0ed7-db7e-4a9d-959e-9cd79d940ca5" />

## 1. Connect and save

| Field | Meaning |
|---|---|
| Provider | GitHub |
| Owner | The repository's owner (an organization or a user) |
| Repository | The repository name |
| Token | A personal access token that can read the repository |
| Branch | The branch whose commits are followed (e.g. `main`) |

1. Pick the Provider and fill in the fields.
2. Press Test & save.

Only settings that reach the repository are saved, and that Provider becomes the one in use, marked `●`.
To switch to another VCS, press `Use this provider`.

Note: once the token is saved, Owner, Repository and Token cannot be changed; press Reset to drop it and enter it again.

---

## 2. Tie videos to the code

Pass the paths a video relates to, either when uploading it or on the video afterwards ([maintenance CLI guide](../../../maintenance/README.md)).

```bash
# When uploading
go run . upload-video \
  --title "title" \
  --folder_key "folder_key" \
  --scene_path "scene_path" \
  --video_path "/path/to/video.mp4" \
  --vcs_watch_paths "/path/to/file1,/path/to/file2"
```

```bash
# After uploading, on the video itself
go run . patch-video \
  --video_id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  --vcs_watch_paths "/path/to/file1,/path/to/file2"
```

## 3. Check it

The Changes tab shows the commits and pull requests that touched those paths between the previous revision and the upload date.

<img src="https://github.com/user-attachments/assets/ebe41883-3720-4b3f-9bc1-3177e36f3bbd" width="320" />
