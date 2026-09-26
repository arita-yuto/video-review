# VCS

With a repository connected, the Changes tab of a video's side panel shows the commits and pull requests tied to that revision.
With the AI features on, it shows a summary of them too ([AI Features Guide](../../build.run/ai-guide.md)).

<img src="image of VCS goes here">

## 2. Connect and save

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

## 3. Tie videos to the code

When uploading a video, pass the paths it relates to.
They are given on the maintenance CLI's upload ([maintenance CLI guide](../../../maintenance/README.md)).

The Changes tab then shows the commits and pull requests that touched those paths between the previous revision and this one.
