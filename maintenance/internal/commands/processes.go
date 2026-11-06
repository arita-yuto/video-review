package commands

import (
	"bufio"
	"errors"
	"flag"
	"fmt"
	"io"
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
	dir := fs.String("dir", "", "Zip install folder or docker compose clone; defaults to VIDEO_REVIEW_INSTALL_DIR, then the current folder")
	fs.Parse(args)

	abs := absDir(*dir)
	if isComposeInstall(abs) {
		if err := runCompose(abs, "up", "-d"); err != nil {
			fail(err)
		}
		return
	}

	tag := (&Upgrader{Dir: abs}).installedTag()
	if tag == "" {
		fail(errors.New(abs + " has no release in releases/"))
	}

	if err := startInstall(abs, tag); err != nil {
		fail(err)
	}
}

func RunStop(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	dir := fs.String("dir", "", "Zip install folder or docker compose clone; defaults to VIDEO_REVIEW_INSTALL_DIR, then the current folder")
	fs.Parse(args)

	abs := absDir(*dir)
	if isComposeInstall(abs) {
		if err := runCompose(abs, "stop"); err != nil {
			fail(err)
		}
		return
	}

	if err := stopInstall(abs); err != nil {
		fail(err)
	}
}

// Links resolved, as the working folder of a running process is reported.
func absDir(dir string) string {
	if dir == "" {
		dir = os.Getenv("VIDEO_REVIEW_INSTALL_DIR")
	}
	if dir == "" {
		dir = "."
	}

	abs, err := filepath.Abs(dir)
	if err == nil {
		abs, err = filepath.EvalSymlinks(abs)
	}
	if err != nil {
		fail(err)
	}
	return abs
}

func fail(err error) {
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
	// Only the worker's children are its own; the web's can be the upgrade that is stopping it.
	if err := stopProcess(pid, role == "worker"); err != nil {
		return fmt.Errorf("stopping %s: %w", role, err)
	}
	return os.Remove(pidFile(installDir, role))
}

// start.js listens on PORT, where the environment the CLI passes on wins over the install's .env, or on 3489.
func installPort(installDir string) string {
	if port := os.Getenv("PORT"); port != "" {
		return port
	}

	file, err := os.Open(filepath.Join(installDir, ".env"))
	if err != nil {
		return "3489"
	}
	defer file.Close()

	port := "3489"
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		value, ok := strings.CutPrefix(strings.TrimSpace(scanner.Text()), "PORT=")
		if !ok {
			continue
		}
		value, _, _ = strings.Cut(value, "#")
		port = strings.Trim(strings.TrimSpace(value), `"'`)
	}
	return port
}

func awaitVersion(installDir string, tag string) error {
	url := "http://127.0.0.1:" + installPort(installDir) + "/api/v1/version"
	client := &http.Client{Timeout: 2 * time.Second}
	for i := 0; i < 60; i++ {
		res, err := client.Get(url)
		if err == nil {
			body, _ := io.ReadAll(io.LimitReader(res.Body, 256))
			res.Body.Close()
			if strings.Contains(string(body), `"`+tag+`"`) {
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

// Starts the roles that are not running yet and waits until the web answers as tag.
func startInstall(installDir string, tag string) error {
	for _, role := range roles {
		if pid := runningPID(installDir, role); pid != 0 {
			fmt.Printf("%s is already running (pid %d)\n", role, pid)
			continue
		}
		if err := startRole(installDir, tag, role); err != nil {
			return err
		}
	}

	if err := awaitVersion(installDir, tag); err != nil {
		return err
	}
	fmt.Printf("%s is running; logs are in %s\n", tag, filepath.Join(installDir, "logs"))
	return nil
}

// Stops the old release before starting the new one, since both listen on the same port, and goes back to previous if the new one never answers.
func restartInstall(installDir string, tag string, previous string) error {
	if err := stopInstall(installDir); err != nil {
		return err
	}

	failed := startInstall(installDir, tag)
	if failed == nil || previous == "" {
		return failed
	}

	fmt.Printf("%s did not start (%v); starting %s again\n", tag, failed, previous)
	if err := stopInstall(installDir); err != nil {
		return err
	}
	if err := startInstall(installDir, previous); err != nil {
		return err
	}
	return fmt.Errorf("%s did not start, so %s runs again; see %s", tag, previous, filepath.Join(installDir, "logs"))
}

func stopInstall(installDir string) error {
	for _, role := range roles {
		if err := stopRole(installDir, role); err != nil {
			return err
		}
	}
	return nil
}
