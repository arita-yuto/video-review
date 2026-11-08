---
title: "Jira"
sidebar:
  order: 1
---
Connecting to Jira lets you:

- Create Jira issues from comments, or link a comment to an existing issue
- See and change the status of an issue from its comment

<img src="/video-review/images/admin/integrations/issue-tracker/jira-section.webp" />

## 1. Connect and save

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

## 2. Work with comments

### Create an issue from a comment

In the Comments panel, choose Create issue from a comment's menu.  
With the Task and Bug issue types set, you can create either kind.  
The first line of the comment becomes the issue summary, and the whole text, the video, the time, the author and a link to the comment go in the description.

<img src="/video-review/images/admin/integrations/issue-tracker/convert-comment.webp" />

### Link an existing issue

Type the issue key into the issue field under the comment to link it to an issue already in Jira.

<img src="/video-review/images/admin/integrations/issue-tracker/link-existing-issue.webp" />

### See and change the status

A comment's issue carries a status icon.  
Change status in the comment's menu updates the issue's status.

<img src="/video-review/images/admin/integrations/issue-tracker/change-status.webp" />
