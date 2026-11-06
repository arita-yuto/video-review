//go:build windows

package commands

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
)

const (
	createNewProcessGroup = 0x00000200
	detachedProcess       = 0x00000008
)

// Without a console of its own the server keeps running after the window that ran the CLI closes.
func detached() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{CreationFlags: createNewProcessGroup | detachedProcess}
}

func isInstallProcess(pid int, installDir string) bool {
	out, err := exec.Command("powershell", "-NoProfile", "-Command",
		"(Get-CimInstance Win32_Process -Filter 'ProcessId="+strconv.Itoa(pid)+"').CommandLine").Output()
	return err == nil && strings.Contains(strings.ToLower(string(out)), strings.ToLower(filepath.Join(installDir, "releases")))
}

// Windows has no SIGTERM for a process without a console, so the server is ended outright; /T also ends its children.
func stopProcess(pid int, withChildren bool) error {
	process, err := os.FindProcess(pid)
	if err != nil {
		return err
	}

	args := []string{"/F", "/PID", strconv.Itoa(pid)}
	if withChildren {
		args = append(args, "/T")
	}
	if err := exec.Command("taskkill", args...).Run(); err != nil {
		return err
	}
	_, err = process.Wait()
	return err
}
