# Users

List users, create them, change their role, and create or update them in bulk with a CSV file.

<img src="https://github.com/user-attachments/assets/a240238d-d412-40b7-80a0-ffd0a9aad974" />

## 1. Create a user

Use Create user below the list.

1. Enter Display name, Email and Password (6 characters or more).
2. Press Create.

The new user is a viewer and appears at the end of the list.

---

## 2. Create and update users with a CSV file

Export the users to a CSV file, edit it and import it to create and update users in one go.

### Export to a CSV file

Press Export above the list to download `users.csv`.

Note: the CLI exports with `export-users` ([maintenance CLI guide](../../maintenance/README.md)).

### Edit the CSV file

| Column | Content |
|---|---|
| id | Empty creates a new user; a value updates that user |
| name | Display name (required) |
| email | The email address used to log in (required when creating) |
| pass | Password, 6 characters or more (required when creating)<br>When updating, fill it in only to reset the password |
| role | `viewer` or `admin` (empty means `viewer` when creating) |
| active | `true` or `false` (empty means `true` when creating)<br>A `false` user cannot log in |

An empty cell in a row that updates a user keeps the current value.  
The exported file leaves pass empty for security.  
Fill in a new password only for the users whose password should change.

Note: save the file as UTF-8.  
Note: you cannot change the role, active or pass of your own row.

### Import the CSV file

1. Press Import above the list.

<img src="https://github.com/user-attachments/assets/352911f9-6063-4d6c-8add-5dd30ddb9799" />

2. Choose the CSV file and press Import.

<img src="https://github.com/user-attachments/assets/849e6b93-7ffd-4dc4-8308-fc035d92ed91" />

When the import succeeds, the number of created and updated users is shown.  
When there are errors, nothing is applied and a list of the row, column and reason is shown.

---

## 3. Permissions

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
