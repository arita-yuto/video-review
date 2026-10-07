# VideoReview Maintenance CLI

This is a CLI tool for maintaining VideoReview.  
It is an **internal administrator tool** separate from the main application.

## Build Instructions

### Windows
> $env:GOOS="windows"; $env:GOARCH="amd64"; go build -o video-review-cli.exe

### Mac
> GOOS=darwin GOARCH=arm64 go build -o video-review-cli

### Linux
> GOOS=linux GOARCH=amd64 go build -o video-review-cli

Note: prebuilt binaries are on the GitHub Releases page (`video-review-cli-<OS>-<Architecture>`).

## API Token

VideoReview uses an API token for maintenance and automation.

After initial setup, an administrator can generate an API token
from the web UI.

See the [Admin Screen Guide](../documents/admin/api-token.md) for details.

## Required Environment Variables

URL of the server running VideoReview
> VIDEO_REVIEW_SERVER_URL

VideoReview API Token  
Set the API token generated from the web UI
> VIDEO_REVIEW_API_TOKEN

It can also be specified directly in the command.
> go run . --server http://xxx.xxx.xxx.xxx:3489 --token xxxxxx command --video_id xxx

Note: `--server` starts with `http://` or `https://`.  
Note: put `--server` and `--token` before the command name.

### Command List

##### Create the first administrator
> go run . bootstrap --email Nijika@example.com --pass 123abc

Note: the first administrator can also be created on the web screen.

##### Create a user
> go run . create-user --name Nijika --email Nijika@example.com --pass 123abc

##### Create users from a CSV file
> go run . import-users --file users.csv

##### CSV example
| id | name (required) | email (required) | pass (required) | role |
|---|---|---|---|---|
|  | Bocchi | bocchi@example.com | secret01 | viewer |
|  | Nijika | nijika@example.com | secret02 |  |

Note: an empty `role` means `viewer`.  
Note: leave `id` empty; the system uses it.  
Note: save the file as UTF-8.  

##### Get the video list (JSON)
> go run . get-videos  
> go run . get-videos --include_revisions true  
> go run . get-videos --filter_tree "battle"

Note: `--filter_tree` narrows the list to titles or folder keys that contain the text.

##### Get a video's revision information (JSON)
> go run . get-videos-rev --video_id {uuid}

##### Logically delete a video
> go run . delete-video --video_id {uuid}

##### Delete the specified revision of a video
* Performs file deletion + logical deletion
* Cannot be undone after execution
> go run . purge-revision --video_id {uuid} --revision 1

##### Upload a video
> go run . upload-video --title "title" --folder_key "folder_key" --scene_path "scene_path" --video_path "/path/to/video.mp4"

To register the files whose VCS changes matter at the same time, add `--vcs_watch_paths` as a comma-separated list.
> go run . upload-video --title "title" --folder_key "folder_key" --video_path "/path/to/video.mp4" --vcs_watch_paths "Assets/Scenes/Boss.unity,Assets/Prefabs"

##### Change a video's settings
Replace the files whose VCS changes matter for a video already uploaded.
> go run . patch-video --video_id {uuid} --vcs_watch_paths "Assets/Scenes/Boss.unity,Assets/Prefabs"

##### Create thumbnails
> go run . create-video-tmb --video_id {uuid}  
> go run . create-video-tmb-all

Note: ffmpeg is needed on the PC that runs the CLI.

##### Get comments
> go run . get-comments --video_id {uuid}

##### Set tags and a summary
> go run . annotate-video-rev --video_rev_id {uuid} --tags "A,B,C" --summary "summary text"

Note: only the fields you pass change (with only `--tags`, the summary stays as it is).

##### Upload a video's event context
> go run . upload-video-event-context --video_rev_id {uuid} --json_path "events.json"

The JSON is an array of events.
```json
[
  { "kind": "log", "startMs": 1200, "endMs": 1800, "data": "Boss spawned" },
  { "kind": "subtitle", "startMs": 3000, "endMs": 5000, "data": "Here it comes" }
]
```

Note: `kind` is set on each event.  
Note: each upload replaces the events of the same `kind` on that revision.

##### Warm the VCS cache
Fetch the VCS changes for a period before people open the Changes tab.
> go run . warm-vcs-cache --days 30  
> go run . warm-vcs-cache --from 2026-03-01T00:00:00Z --to 2026-04-01T00:00:00Z

Note: days already fetched are skipped.  
Note: add `--refresh` to fetch them again.  
Note: write the dates in UTC, ending with `Z`.
