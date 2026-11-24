package commands

import (
	"errors"
	"flag"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
)

func RunRunOnce(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	dir := fs.String("dir", "", "Install folder; defaults to the current folder")
	fs.Parse(args)

	abs := absDir(*dir)
	tag := (&Upgrader{Dir: abs}).installedTag()
	if tag == "" {
		fail(errors.New(abs + " has no release in releases/"))
	}

	worker := exec.Command("node", filepath.Join(abs, "releases", tag, "start.js"), "worker", "--once")
	worker.Dir = abs
	worker.Stdin = os.Stdin
	worker.Stdout = os.Stdout
	worker.Stderr = os.Stderr

	// The CLI outlives Ctrl+C to pass on the worker's exit code; the worker receives the signal itself.
	// Not signal.Ignore: the worker and ffmpeg would inherit an ignored signal.
	signal.Notify(make(chan os.Signal, 1), os.Interrupt)

	err := worker.Run()

	var exited *exec.ExitError
	if errors.As(err, &exited) {
		os.Exit(exited.ExitCode())
	}
	if err != nil {
		fail(err)
	}
}
