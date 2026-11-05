//go:build !windows

package commands

import (
	"errors"
	"os"
	"strconv"
	"syscall"
	"time"
)

// A new session keeps the server running after the shell that ran the CLI closes.
func detached() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{Setsid: true}
}

// Next renames its process title, so the command line no longer names start.js; start.js moves into the install folder.
func isInstallProcess(pid int, installDir string) bool {
	cwd, err := os.Readlink("/proc/" + strconv.Itoa(pid) + "/cwd")
	return err == nil && cwd == installDir
}

func stopProcess(pid int) error {
	if err := syscall.Kill(pid, syscall.SIGTERM); err != nil {
		return err
	}

	for i := 0; i < 100; i++ {
		if syscall.Kill(pid, 0) != nil {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}

	if err := syscall.Kill(pid, syscall.SIGKILL); err != nil && !errors.Is(err, syscall.ESRCH) {
		return err
	}
	return nil
}
