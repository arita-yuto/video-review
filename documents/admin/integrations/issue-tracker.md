# Jira

Connecting to Jira gives you three things:

- Create Jira issues from comments, or link a comment to an existing issue
- See and change the status of an issue from its comment
- Log in with a Jira email address (the JIRA tab on the login screen)

<img src="https://github.com/user-attachments/assets/c14c6896-8e6a-416c-a44f-b94e823f17a7" />

## 2. Connect and save

| Field | Meaning |
|---|---|
| Deployment | The kind of Jira: Data Center or Cloud |
| URL | The Jira URL (e.g. `https://jira.example.com`, or `https://example.atlassian.net` for Cloud) |
| Email | Cloud only: the email of the account that issued the token |
| Token | A personal access token on Data Center; the account's API token on Cloud |
| Project | The key of the project issues are created in |
| Assignee | The assignee of created issues (optional) |
| Task issue type | The issue type name used when a Task is created from a comment (optional) |
| Bug issue type | The issue type name used when a Bug is created from a comment (optional) |

1. Fill in the fields.
2. Press Test & save.

Test & save connects to Jira, checks the project and the issue types, and saves the settings when that succeeds.

Note: write issue type names exactly as they are in the project (an unknown name fails Test & save).  
Note: once the token is saved, the URL and the token cannot be changed; press Reset to drop the saved token and enter it again.  
Note: a Cloud API token expires (after a year at most); when it does, press Reset and enter a new one.  

---

## 3. Work with comments

### Create an issue from a comment

In the Comments panel, choose Create issue from a comment's menu.  
With the Task and Bug issue types set, you can create either kind.  
The first line of the comment becomes the issue summary, and the whole text, the video, the time, the author and a link to the comment go in the description.

<img src="https://github.com/user-attachments/assets/b6543793-3244-4284-a997-d6f057e9424c" />

### Link an existing issue

Type the issue key into the issue field under the comment to link it to an issue already in Jira.

<img src="https://github.com/user-attachments/assets/0986dfc3-c417-4e7c-b922-0aae32a09e81" />

### See and change the status

A comment's issue carries a status icon.  
Change status in the comment's menu updates the issue's status.

<img src="https://github.com/user-attachments/assets/aab3530d-ad58-411a-99ec-475c1a091f9f" />

### Log in with a Jira email address

On the JIRA tab of the login screen, enter the email address registered in Jira.
If Jira has that user, a VideoReview user is created and logged in.
