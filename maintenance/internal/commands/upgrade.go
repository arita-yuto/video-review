package commands

import (
	"archive/zip"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"
)

type githubRelease struct {
	TagName    string        `json:"tag_name"`
	Draft      bool          `json:"draft"`
	Prerelease bool          `json:"prerelease"`
	Assets     []githubAsset `json:"assets"`
}

type githubAsset struct {
	Name        string `json:"name"`
	DownloadURL string `json:"browser_download_url"`
}

// Installs the newest release into <Dir>/releases/<tag>/ and applies its migrations.
type Upgrader struct {
	Dir string
	// Also take release candidates, for checking an update before it ships.
	Prerelease  bool
	ReleasesURL string
	AssetName   string
	HTTP        *http.Client
	Migrate     func(releaseDir string) error
	// Replaces the running web and worker with the release just installed.
	Restart func(tag string) error
	Out     io.Writer
}

func RunUpgrade(cmd string, args []string) {
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	dir := fs.String("dir", ".", "Install folder holding .env and releases/")
	prerelease := fs.Bool("prerelease", false, "Also install release candidates")
	fs.Parse(args)

	abs := absDir(*dir)
	hasReleases := dirExists(filepath.Join(abs, "releases"))
	// A clone also holds compose.prod.yml, so only running containers mark a docker compose install.
	if !hasReleases && composeRunning(abs) {
		if *prerelease {
			fail(errors.New("--prerelease works only for a zip install"))
		}
		if err := composeUpgrade(abs); err != nil {
			fail(fmt.Errorf("upgrade failed: %w", err))
		}
		return
	}

	if !hasReleases {
		fail(errors.New(abs + " has neither releases/ from a zip nor running docker compose containers"))
	}

	// A server started by hand holds the port, so the new release could not take it over.
	if runningPID(abs, "web") == 0 && portAnswers(abs) {
		fail(errors.New("the server on port " + installPort(abs) + " was not started with video-review-cli start; stop it and run upgrade again"))
	}

	// A stalled connection would otherwise keep upgrade waiting forever; the zip is about 130MB.
	client := &http.Client{Timeout: 10 * time.Minute}
	u := &Upgrader{
		Dir:         abs,
		Prerelease:  *prerelease,
		ReleasesURL: "https://api.github.com/repos/arita-yuto/video-review/releases?per_page=30",
		AssetName:   fmt.Sprintf("video-review-%s-x64.zip", runtime.GOOS),
		HTTP:        client,
		Migrate:     nodeMigrate,
		Restart:     func(tag string) error { return restartInstall(abs, tag) },
		Out:         os.Stdout,
	}
	if err := u.Run(); err != nil {
		fail(fmt.Errorf("upgrade failed: %w", err))
	}
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func composeRunning(dir string) bool {
	if _, err := os.Stat(filepath.Join(dir, "compose.prod.yml")); err != nil {
		return false
	}

	cmd := exec.Command("docker", "compose", "-f", "compose.prod.yml", "ps", "-q", "videoreview")
	cmd.Dir = dir
	out, err := cmd.Output()
	return err == nil && strings.TrimSpace(string(out)) != ""
}

// Only the app's own services, so the ones a profile or another compose file added keep running untouched.
func composeUpgrade(dir string) error {
	services := []string{"videoreview", "video-processing"}
	steps := [][]string{
		// compose.prod.yml itself changes between releases.
		{"git", "pull"},
		append([]string{"docker", "compose", "-f", "compose.prod.yml", "pull"}, services...),
		append([]string{"docker", "compose", "-f", "compose.prod.yml", "up", "-d"}, services...),
	}

	for _, step := range steps {
		cmd := exec.Command(step[0], step[1:]...)
		cmd.Dir = dir
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("%s: %w", strings.Join(step, " "), err)
		}
	}
	return nil
}

func nodeMigrate(releaseDir string) error {
	cmd := exec.Command("node", filepath.Join(releaseDir, "start.js"), "migrate")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (u *Upgrader) Run() error {
	current := u.installedTag()

	release, asset, err := u.latestRelease()
	if err != nil {
		return err
	}

	if release == nil {
		return fmt.Errorf("no release has %s", u.AssetName)
	}

	if current != "" && !versionNewer(release.TagName, current) {
		fmt.Fprintf(u.Out, "%s is the latest release\n", current)
		return nil
	}

	fmt.Fprintf(u.Out, "installing %s\n", release.TagName)
	releaseDir := filepath.Join(u.Dir, "releases", release.TagName)
	if err := u.install(asset.DownloadURL, releaseDir); err != nil {
		return err
	}

	u.removeOldReleases()
	return u.Restart(release.TagName)
}

// The newest release folder, which install names only after its migrations succeed.
func (u *Upgrader) installedTag() string {
	tags := u.releaseTags()
	if len(tags) == 0 {
		return ""
	}
	return tags[len(tags)-1]
}

// Release folders, oldest first.
func (u *Upgrader) releaseTags() []string {
	entries, err := os.ReadDir(filepath.Join(u.Dir, "releases"))
	if err != nil {
		return nil
	}

	var tags []string
	for _, e := range entries {
		if e.IsDir() && parseVersion(e.Name()) != nil {
			tags = append(tags, e.Name())
		}
	}
	sort.Slice(tags, func(i, j int) bool { return versionNewer(tags[j], tags[i]) })
	return tags
}

// Keeps the two newest, so the one before the update can still be started by hand.
func (u *Upgrader) removeOldReleases() {
	tags := u.releaseTags()
	for len(tags) > 2 {
		os.RemoveAll(filepath.Join(u.Dir, "releases", tags[0]))
		tags = tags[1:]
	}
}

func (u *Upgrader) latestRelease() (*githubRelease, *githubAsset, error) {
	res, err := u.HTTP.Get(u.ReleasesURL)
	if err != nil {
		return nil, nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, nil, errors.New("GitHub answered " + strconv.Itoa(res.StatusCode))
	}

	var releases []githubRelease
	if err := json.NewDecoder(res.Body).Decode(&releases); err != nil {
		return nil, nil, err
	}
	release, asset := pickRelease(releases, u.AssetName, u.Prerelease)
	return release, asset, nil
}

// The newest release that has an asset for this OS; release candidates count only with prerelease.
func pickRelease(releases []githubRelease, assetName string, prerelease bool) (*githubRelease, *githubAsset) {
	var picked *githubRelease
	var pickedAsset *githubAsset
	for i := range releases {
		r := &releases[i]
		if r.Draft || (r.Prerelease && !prerelease) || parseVersion(r.TagName) == nil {
			continue
		}
		for j := range r.Assets {
			a := &r.Assets[j]
			if a.Name == assetName && (picked == nil || versionNewer(r.TagName, picked.TagName)) {
				picked, pickedAsset = r, a
			}
		}
	}
	return picked, pickedAsset
}

// Migrates in <tag>.partial and renames it to <tag> only on success, so installedTag never counts an unfinished install.
func (u *Upgrader) install(url string, releaseDir string) error {
	partial := releaseDir + ".partial"
	os.RemoveAll(partial)

	archive, err := u.downloadZip(url, filepath.Dir(releaseDir))
	if err != nil {
		return err
	}
	defer os.Remove(archive)

	if err := unzip(archive, partial); err != nil {
		return err
	}

	if err := u.Migrate(partial); err != nil {
		return fmt.Errorf("migrations failed: %w", err)
	}

	return os.Rename(partial, releaseDir)
}

func (u *Upgrader) downloadZip(url string, dir string) (string, error) {
	res, err := u.HTTP.Get(url)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return "", errors.New("the download answered " + strconv.Itoa(res.StatusCode))
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	archive, err := os.CreateTemp(dir, "release-*.zip")
	if err != nil {
		return "", err
	}
	defer archive.Close()

	if _, err := io.Copy(archive, res.Body); err != nil {
		os.Remove(archive.Name())
		return "", err
	}

	return archive.Name(), nil
}

func unzip(archive string, dir string) error {
	reader, err := zip.OpenReader(archive)
	if err != nil {
		return err
	}
	defer reader.Close()

	for _, file := range reader.File {
		path := filepath.Join(dir, file.Name)
		// A name with ".." would write outside the release folder.
		if path != filepath.Clean(dir) && !strings.HasPrefix(path, filepath.Clean(dir)+string(os.PathSeparator)) {
			return fmt.Errorf("%s leaves the release folder", file.Name)
		}

		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(path, 0o755); err != nil {
				return err
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return err
		}

		if err := extractFile(file, path); err != nil {
			return err
		}
	}
	return nil
}

func extractFile(file *zip.File, path string) error {
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, file.Mode().Perm()|0o600)
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}

var versionPattern = regexp.MustCompile(`^v(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$`)

// [major, minor, patch, rc]; a release without -rc counts as newer than any of its candidates.
func parseVersion(tag string) []int {
	m := versionPattern.FindStringSubmatch(tag)
	if m == nil {
		return nil
	}
	parts := make([]int, 4)
	for i := 0; i < 3; i++ {
		parts[i], _ = strconv.Atoi(m[i+1])
	}
	parts[3] = int(^uint(0) >> 1)
	if m[4] != "" {
		parts[3], _ = strconv.Atoi(m[4])
	}
	return parts
}

// False when either tag is not a release.
func versionNewer(tag string, than string) bool {
	a, b := parseVersion(tag), parseVersion(than)
	if a == nil || b == nil {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return a[i] > b[i]
		}
	}
	return false
}
