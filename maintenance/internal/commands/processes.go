package commands

import (
	"bufio"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

var roles = []string{"web", "worker"}

func RunStart(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	dir := fs.String("dir", ".", "Install folder holding .env and releases/")
	fs.Parse(args)

	abs := absDir(*dir)
	u := &Upgrader{Dir: abs}
	tag := u.installedTag()
	if tag == "" {
		exitWith(errors.New(abs + " has no release in releases/"))
	}

	for _, role := range roles {
		if pid := runningPID(abs, role); pid != 0 {
			fmt.Printf("%s is already running (pid %d)\n", role, pid)
			continue
		}
		if err := startRole(abs, tag, role); err != nil {
			exitWith(err)
		}
	}

	if err := waitForVersion(abs, tag); err != nil {
		exitWith(err)
	}
	fmt.Printf("%s is running; logs are in %s\n", tag, filepath.Join(abs, "logs"))
}

func RunStop(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	dir := fs.String("dir", ".", "Install folder holding .env and releases/")
	fs.Parse(args)

	abs := absDir(*dir)
	for _, role := range roles {
		if err := stopRole(abs, role); err != nil {
			exitWith(err)
		}
	}
}

func absDir(dir string) string {
	abs, err := filepath.Abs(dir)
	if err != nil {
		exitWith(err)
	}
	return abs
}

func exitWith(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}

func pidFile(installDir string, role string) string {
	return filepath.Join(installDir, "run", role+".pid")
}

// The pid this CLI recorded, if that process still belongs to the install; a pid left from before a reboot can belong to anything.
func runningPID(installDir string, role string) int {
	body, err := os.ReadFile(pidFile(installDir, role))
	if err != nil {
		return 0
	}

	pid, err := strconv.Atoi(strings.TrimSpace(string(body)))
	if err != nil || !isInstallProcess(pid, installDir) {
		return 0
	}
	return pid
}

func startRole(installDir string, tag string, role string) error {
	logs := filepath.Join(installDir, "logs")
	if err := os.MkdirAll(logs, 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(installDir, "run"), 0o755); err != nil {
		return err
	}

	log, err := os.OpenFile(filepath.Join(logs, role+".log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return err
	}
	defer log.Close()

	cmd := exec.Command("node", filepath.Join(installDir, "releases", tag, "start.js"), role)
	cmd.Dir = installDir
	cmd.Stdout = log
	cmd.Stderr = log
	cmd.SysProcAttr = detached()
	if err := cmd.Start(); err != nil {
		return err
	}

	pid := cmd.Process.Pid
	cmd.Process.Release()
	fmt.Printf("started %s %s (pid %d)\n", tag, role, pid)
	return os.WriteFile(pidFile(installDir, role), []byte(strconv.Itoa(pid)+"\n"), 0o644)
}

func stopRole(installDir string, role string) error {
	pid := runningPID(installDir, role)
	if pid == 0 {
		return nil
	}

	fmt.Printf("stopping %s (pid %d)\n", role, pid)
	if err := stopProcess(pid); err != nil {
		return fmt.Errorf("stopping %s: %w", role, err)
	}
	return os.Remove(pidFile(installDir, role))
}

// start.js listens on PORT from the install's .env, or 3489.
func installPort(installDir string) string {
	file, err := os.Open(filepath.Join(installDir, ".env"))
	if err != nil {
		return "3489"
	}
	defer file.Close()

	port := "3489"
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		if value, ok := strings.CutPrefix(strings.TrimSpace(scanner.Text()), "PORT="); ok {
			port = strings.Trim(value, `"'`)
		}
	}
	return port
}

func waitForVersion(installDir string, tag string) error {
	url := "http://127.0.0.1:" + installPort(installDir) + "/api/v1/version"
	client := &http.Client{Timeout: 2 * time.Second}
	for i := 0; i < 60; i++ {
		res, err := client.Get(url)
		if err == nil {
			body := make([]byte, 256)
			n, _ := res.Body.Read(body)
			res.Body.Close()
			if strings.Contains(string(body[:n]), `"`+tag+`"`) {
				return nil
			}
		}
		time.Sleep(time.Second)
	}
	return fmt.Errorf("%s did not answer as %s within 60 seconds; see %s", url, tag, filepath.Join(installDir, "logs", "web.log"))
}

func portAnswers(installDir string) bool {
	client := &http.Client{Timeout: 2 * time.Second}
	res, err := client.Get("http://127.0.0.1:" + installPort(installDir) + "/api/v1/version")
	if err != nil {
		return false
	}
	res.Body.Close()
	return true
}

// Stops the old release before starting the new one, since both listen on the same port.
func restartInstall(installDir string, tag string) error {
	for _, role := range roles {
		if err := stopRole(installDir, role); err != nil {
			return err
		}
	}
	for _, role := range roles {
		if err := startRole(installDir, tag, role); err != nil {
			return err
		}
	}
	if err := waitForVersion(installDir, tag); err != nil {
		return err
	}
	fmt.Printf("%s is running; logs are in %s\n", tag, filepath.Join(installDir, "logs"))
	return nil
}
