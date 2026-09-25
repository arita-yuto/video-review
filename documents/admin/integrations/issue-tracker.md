# Jira

Connecting to Jira gives you two things:

- Create Jira issues from comments
- Log in with a Jira email address (the JIRA tab on the login screen)

---

## 1. Open

Open Administration → Integrations → Jira.

---

## 2. Connect and save

| Field | Meaning |
|---|---|
| URL | The Jira URL, e.g. `https://example.atlassian.net` |
| Token | A Jira API token (sent as Bearer) |
| Project | The key of the project issues are created in |
| Assignee | The assignee of created issues (optional) |
| Task issue type | The issue type name used when a Task is created from a comment (optional) |
| Bug issue type | The issue type name used when a Bug is created from a comment (optional) |

1. Fill in the fields.
2. Press Test & save.

The screen connects to Jira, checks the project and the issue types, and saves only settings that pass.
A green `●` next to the heading means the connection works.

- Issue type names must match the ones in the project exactly; an unknown name fails Test & save.
- Once a token is saved, the URL and the token are locked. To change them, press Reset to drop the saved token and enter it again.

---

## 3. Use it

### Create an issue from a comment

In the Comments panel, choose Create issue from a comment's menu.
With the Task and Bug issue types set, you can create either kind.

### Log in with a Jira email address

On the login screen's JIRA tab, enter the email address registered in Jira.
When Jira knows the user, a VideoReview user is created and logged in.

---

## 4. Moving from `.env`

The `VIDEO_REVIEW_JIRA_*` variables are read until you save on the admin screen.
Test & save also stores the values that came from `.env`; from then on `.env` has no effect.
