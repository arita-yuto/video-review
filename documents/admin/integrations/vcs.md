# VCS

With a repository connected, the Changes tab of a video's side panel shows the commits and pull requests behind that revision.
With the AI features on, it also shows a summary of them ([AI Features Guide](../../build.run/ai-guide.md)).

---

## 1. Open

Open Administration → Integrations → VCS.

---

## 2. Connect and save

| Field | Meaning |
|---|---|
| Provider | GitHub |
| Owner | The repository's owner (an organization or a user) |
| Repository | The repository name |
| Token | A personal access token that can read the repository |
| Branch | The branch whose commits are followed, e.g. `main` |

1. Pick the Provider and fill in the fields.
2. Press Test & save.

Only settings that reach the repository are saved, and that provider becomes the one in use, marked `●`.
To switch to another provider, press "Use this provider".

- Once a token is saved, Owner, Repository and Token are locked. To change them, press Reset to drop the token and enter it again.

---

## 3. Tie videos to the code

When a video is uploaded, pass the paths it relates to.
The maintenance CLI's upload takes them ([maintenance CLI guide](../../../maintenance/README.md)).

The Changes tab then lists the commits and pull requests that touched those paths between the previous revision and this one.

---

## 4. Moving from `.env`

The `VIDEO_REVIEW_VCS_*` variables are read until you save on the admin screen.
Test & save also stores the values that came from `.env`; from then on `.env` has no effect.
