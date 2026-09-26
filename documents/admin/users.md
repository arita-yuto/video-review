# Users

List users, create them and change their role.

<img src="image of Users goes here">

## 1. Create a user

Use Create user below the list.

1. Enter Display name, Email and Password (6 characters or more).
2. Press Create.

The new user is a viewer and appears at the end of the list.

Note: guests are not created here.  
Note: while guest login is on, anyone can log in with just a display name ([General](general.md)).  
Note: users who log in with Jira are created on their first login ([Jira](integrations/issue-tracker.md)).

---

## 2. Permissions

Written by what the server's API lets through.

### Reading

| Action | guest | viewer | admin |
|---|---|---|---|
| Video list, folders, metadata, revisions | guest-visible videos only | ○ | ○ |
| Play a video | guest-visible videos only | ○ | ○ |
| Download a video file (at a chosen resolution) | × | ○ | ○ |
| Read comments, keep read marks | ○ | ○ | ○ |
| Events, VCS Changes and the AI summary | guest-visible videos only | ○ | ○ |

### Writing

| Action | guest | viewer | admin |
|---|---|---|---|
| Create and update comments | ○ | ○ | ○ |
| Draw on a video | ○ | ○ | ○ |
| Create a Jira issue from a comment | × | ○ | ○ |
| Send a comment notification (Slack / Webhook / Email) | × | ○ | ○ |
| Chat search and MCP | × | ○ | ○ |
| Change own profile and avatar | × | ○ | ○ |
| Upload a video (Web / CLI) | × | × | ○ |
| Change video metadata (tags, summary, guest-visible flag) | × | × | ○ |
| Register thumbnails, read the upload status | × | × | ○ |
| Everything in Administration (users, deleting videos, integrations, API Token) | × | × | ○ |

Note: the API Token acts as an admin.  
Note: guest-visible is a flag an admin sets per video.  
Note: comments can be read and written whatever the video's flag.
