//go:build !windows

package commands

import (
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

// A new session keeps the server running after the shell that ran the CLI closes.
func detached() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{Setsid: true}
}

// Next renames its process title, so the command line no longer names start.js; start.js moves into the install folder.
// The executable is checked too, since after a reboot the pid can belong to a shell sitting in that folder.
func isInstallProcess(pid int, installDir string) bool {
	proc := "/proc/" + strconv.Itoa(pid)
	cwd, err := os.Readlink(proc + "/cwd")
	if err != nil || cwd != installDir {
		return false
	}
	exe, err := os.Readlink(proc + "/exe")
	return err == nil && strings.HasPrefix(filepath.Base(exe), "node")
}

func stopProcess(pid int, withChildren bool) error {
	if err := syscall.Kill(pid, syscall.SIGTERM); err != nil {
		return err
	}

	for i := 0; i < 100; i++ {
		if syscall.Kill(pid, 0) != nil {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}

	target := pid
	// The negative pid reaches the process group Setsid made, so the worker's ffmpeg ends with it.
	if withChildren {
		target = -pid
	}
	if err := syscall.Kill(target, syscall.SIGKILL); err != nil && !errors.Is(err, syscall.ESRCH) {
		return err
	}
	return nil
}
