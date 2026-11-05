//go:build windows

package commands

import (
	"os"
	"os/exec"
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
	return err == nil && strings.Contains(string(out), "start.js")
}

// Windows has no SIGTERM for a process without a console, so the server is ended outright.
func stopProcess(pid int) error {
	process, err := os.FindProcess(pid)
	if err != nil {
		return err
	}
	if err := process.Kill(); err != nil {
		return err
	}
	_, err = process.Wait()
	return err
}
