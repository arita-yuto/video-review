# VideoReview Maintenance CLI

This is a CLI tool for maintaining VideoReview.  
It is an **internal administrator tool** separate from the main application.

The guide (API token, environment variables, commands) is on the docs site: [Maintenance CLI](https://arita-yuto.github.io/video-review/features/maintenance-cli/)

## Build Instructions

### Windows
> $env:GOOS="windows"; $env:GOARCH="amd64"; go build -o video-review-cli.exe

### Mac
> GOOS=darwin GOARCH=arm64 go build -o video-review-cli

### Linux
> GOOS=linux GOARCH=amd64 go build -o video-review-cli

Note: prebuilt binaries are on the GitHub Releases page (`video-review-cli-<OS>-<Architecture>`).
