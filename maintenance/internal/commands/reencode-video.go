package commands

import (
	"flag"
	"fmt"
	. "videoreview-maintenance/internal/lib"
)

func RunReencodeVideo(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	videoId := fs.String("video_id", "", "video id")
	fs.Parse(args)

	if *videoId == "" {
		fmt.Println("videoId is required")
		fs.Usage()
		return
	}

	Fetch(FetchOptions{
		Method: POST,
		Path:   "/api/v1/admin/maintenance/video/reencode",
		Json: map[string]any{
			"videoId": *videoId,
		},
	})
}
