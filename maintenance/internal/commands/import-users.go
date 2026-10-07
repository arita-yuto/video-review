package commands

import (
	"flag"
	"fmt"
	"os"
	. "videoreview-maintenance/internal/lib"
)

func RunImportUsers(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	file := fs.String("file", "", "UTF-8 CSV with the columns id, name, email, pass, role")
	fs.Parse(args)

	if *file == "" {
		fmt.Println("file is required")
		fs.Usage()
		return
	}

	csv, err := os.ReadFile(*file)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	Fetch(FetchOptions{
		Method: POST,
		Path:   "/api/v1/admin/users/import",
		Json: map[string]any{
			"csv": string(csv),
		},
	})
}
