package commands

import (
	"flag"
	"fmt"
	"os"
	. "videoreview-maintenance/internal/lib"
)

func RunExportUsers(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	file := fs.String("file", "", "Path to write the CSV to")
	fs.Parse(args)

	if *file == "" {
		fmt.Println("file is required")
		fs.Usage()
		return
	}

	csv, err := FetchRaw(FetchOptions{
		Method: GET,
		Path:   "/api/v1/admin/users/export",
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if err := os.WriteFile(*file, csv, 0o644); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
