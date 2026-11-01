# Contributing

This project is still in its early stages and is primarily driven by a single maintainer.
Contributions are very welcome, and we aim to keep the process lightweight and approachable.

Rules are intentionally minimal, but please note that
**final decisions on direction, scope, and acceptance are made by the project owner.**

If you're unsure, it's always okay to ask.
If something doesn’t fit, we’ll adjust or discuss it together.

## First Things First

* Small fixes (typos, minor UI tweaks, README updates, etc.) are welcome as direct PRs
* For larger or behavior-changing work, a quick heads-up via an Issue or Discussion is appreciated

These check-ins aren’t meant to slow things down.
They help align expectations early and keep reviews fast.

## Branch Names

There are no strict rules for branch names.
Any clear, descriptive name is fine.

Examples:

* `fix/login-bug`
* `feature/comment-filter`
* `chore/update-readme`

## Commit Messages

Commit message format is flexible.
What matters most is that the intent of the change is easy to understand.

Examples:

* `fix: avoid crash when video is missing`
* `update UI copy`

Commits may be squashed or cleaned up during merge if needed.

## PR Notes (Minimum)

A PR is good to go as long as the following are clear:

* Purpose (what problem the change addresses)
* Changes (what was changed and how)
* Scope (UI / DB / API, etc.)
* Verification (whatever you were able to test)

For UI-related changes, screenshots or a short explanation are very helpful.

## Changes That Need a Quick Consult

Please check in before starting if your change involves:

* Large feature additions that significantly affect behavior or specs
* Database schema changes or new migrations
* API changes that could impact compatibility

Early discussion helps avoid rework and keeps the project consistent.

## Code Style

Please follow the existing style and structure as much as possible.  
Where a frontend file goes, and what it may import, is in the [frontend dependency map](./documents/development/frontend-map.md).

Comments are appreciated for:

* Non-obvious logic
* Design decisions that might not be immediately clear
* Areas where future contributors might hesitate

Clarity matters more than strict formatting.
