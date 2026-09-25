# Users

List users, create them and change their role.

---

## 1. Open

Open Administration → Users.
Users are listed in creation order (display name, email, role, created).

---

## 2. Create a user

Use Create user below the list.

1. Enter Display name, Email and Password (6 characters or more).
2. Press Create.

The new user is a viewer and appears at the end of the list.

- Guests are not created here. While guest login is on, anyone can log in with just a display name ([General](general.md)).
- Users who log in with Jira are created on their first login ([Jira](integrations/issue-tracker.md)).

---

## 3. Change a role

Switch between Viewer and Admin in the Role column.
The change is saved as soon as you pick it.

| Role | Can |
|---|---|
| viewer | Watch and comment on videos, upload |
| admin | Everything a viewer can, plus Administration |

- You can change your own role too, but with no admin left nobody can open Administration.
- Users cannot be deleted, because comments and read marks are tied to them.
