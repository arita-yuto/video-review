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
> go run . --server xxx.xxx.xxx.xxx --token xxxxxx command --video_id xxx

### Command List

##### bootstrap
> go run . bootstrap --email Nijika@example.com --pass 123abc

##### Create an user
> go run . create-user --name Nijika --email Nijika@example.com --pass 123abc

##### Get the video list (JSON)
> go run . get-videos
> go run . get-videos --include_revisions true

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

##### Create thumbnail
> go run . create-video-tmb --video_id {uuid}  
> go run . create-video-tmb-all

##### Cet comments
> go run . get-comments --video_id {uuid}  

##### Annotate video revision
`Manual Annotation`

Set tags and/or summary manually.

> go run . annotate-video-rev --video_rev_id {uuid} --tags "A,B,C" --summary "summary text"

`Automatic Annotation (LLM)`

Generate tags and/or summary using LLM.
> go run . auto-ai-annotate-video-rev

> go run . auto-ai-annotate-video-rev --video_rev_id {uuid}　

Generate for a specific revision.
* --gen_tags
* --gen_summary

`Automatic Annotation (Deterministic)`

Generate tags using predefined rules from video event context.
> go run . auto-deterministic-annotate-video-rev

> go run . auto-deterministic-annotate-video-rev --video_rev_id {uuid}　

##### Upload Video Event Context
Upload normalized event JSON for a video.

> go run . upload-video-event-context --video_id {uuid}　--kind {log|subtitle|etc} --jsonPath "json_path"