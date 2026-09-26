# Jira

Connecting to Jira gives you two things:

- Create Jira issues from comments
- Log in with a Jira email address (the JIRA tab on the login screen)

<img src="https://github.com/user-attachments/assets/c14c6896-8e6a-416c-a44f-b94e823f17a7" />

## 2. Connect and save

| Field | Meaning |
|---|---|
| URL | The Jira URL (e.g. `https://example.atlassian.net`) |
| Token | A Jira API token (sent as Bearer) |
| Project | The key of the project issues are created in |
| Assignee | The assignee of created issues (optional) |
| Task issue type | The issue type name used when a Task is created from a comment (optional) |
| Bug issue type | The issue type name used when a Bug is created from a comment (optional) |

1. Fill in the fields.
2. Press Test & save.

Test & save connects to Jira, checks the project and the issue types, and saves the settings when that succeeds.

Note: write issue type names exactly as they are in the project (an unknown name fails Test & save).  
Note: once the token is saved, the URL and the token cannot be changed; press Reset to drop the saved token and enter it again.

---

## 3. Use it

### Create an issue from a comment

In the Comments panel, choose Create issue from a comment's menu.
With the Task and Bug issue types set, you can create either kind.

<img src="https://github.com/user-attachments/assets/b6543793-3244-4284-a997-d6f057e9424c" />

### Log in with a Jira email address

On the JIRA tab of the login screen, enter the email address registered in Jira.
If Jira has that user, a VideoReview user is created and logged in.
