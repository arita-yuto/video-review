package main

import (
	"flag"
	"fmt"
	"os"
	"strings"

	. "videoreview-maintenance/internal/commands"
	. "videoreview-maintenance/internal/lib"
)

type Command struct {
	Run  func(cmd string, args []string)
	Desc string
}

var commands = map[string]Command{
	"bootstrap": {
		Run:  RunBootstrap,
		Desc: "Bootstrap",
	},
	"create-user": {
		Run:  RunCreateUser,
		Desc: "Create user",
	},
	"export-users": {
		Run:  RunExportUsers,
		Desc: "Export users to a CSV file",
	},
	"import-users": {
		Run:  RunImportUsers,
		Desc: "Create and update users from a CSV file",
	},
	"get-videos": {
		Run:  RunGetVideos,
		Desc: "List videos",
	},
	"get-videos-rev": {
		Run:  RunGetVideosRev,
		Desc: "List video revisions",
	},
	"delete-video": {
		Run:  RunDeleteVideo,
		Desc: "Soft delete video",
	},
	"purge-revision": {
		Run:  RunPurgeRevision,
		Desc: "Purge video revision",
	},
	"upload-video": {
		Run:  RunUploadVideo,
		Desc: "upload video",
	},
	"create-video-tmb": {
		Run:  RunVideoThumbnail,
		Desc: "create video thumbnail",
	},
	"create-video-tmb-all": {
		Run:  RunCreateVideoThumbnailAll,
		Desc: "create video thumbnails for all videos",
	},
	"get-comments": {
		Run:  RunGetComments,
		Desc: "Get comments",
	},
	"annotate-video-rev": {
		Run:  RunAnnotateVideoRev,
		Desc: "Manually set tags and/or summary for a video revision",
	},
	"upload-video-event-context": {
		Run:  RunUploadVideoEventContext,
		Desc: "Upload normalized video event context JSON files",
	},
	"patch-video": {
		Run:  RunPatchVideo,
		Desc: "Update mutable video metadata (e.g. vcsWatchPaths)",
	},
	"warm-vcs-cache": {
		Run:  RunWarmVCSCache,
		Desc: "Pre-warm VCS file cache for a date range (use before users access vcs-changes)",
	},
}

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	fs := flag.NewFlagSet("global", flag.ContinueOnError)
	server := fs.String("server", "", "VideoReview server URL")
	token := fs.String("token", "", "API token")

	if err := fs.Parse(os.Args[1:]); err != nil {
		os.Exit(1)
	}

	baseURL := *server
	if baseURL == "" {
		baseURL = os.Getenv("VIDEO_REVIEW_SERVER_URL")
	}
	apiToken := *token
	if apiToken == "" {
		apiToken = os.Getenv("VIDEO_REVIEW_API_TOKEN")
	}

	if baseURL == "" {
		panic("VIDEO_REVIEW_SERVER_URL is not set")
	}

	if apiToken == "" {
		panic("VIDEO_REVIEW_API_TOKEN is not set")
	}

	args := fs.Args()
	cmd := args[0]

	GlobalConfig = Config{
		BaseURL:  strings.TrimRight(baseURL, "/"),
		APIToken: apiToken,
	}

	c, ok := commands[cmd]
	if !ok {
		fmt.Fprintln(os.Stderr, "unknown command:", cmd)
		printUsage()
		os.Exit(1)
	}
	c.Run(cmd, args[1:])
}

func printUsage() {
	fmt.Println("Usage:")
	for name, c := range commands {
		fmt.Printf("  %s\t%s\n", name, c.Desc)
	}
}
