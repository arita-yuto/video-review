package commands

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
)

const testAsset = "video-review-test-x64.zip"

type fakeRelease struct {
	tag        string
	prerelease bool
}

// fakeGitHub lists the releases and serves each one's zip, whose start.js names its own tag.
type fakeGitHub struct {
	releases  []fakeRelease
	downloads int
}

func (g *fakeGitHub) serve(t *testing.T) *httptest.Server {
	t.Helper()

	var srv *httptest.Server
	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/releases" {
			var list []githubRelease
			for _, rel := range g.releases {
				list = append(list, githubRelease{
					TagName:    rel.tag,
					Prerelease: rel.prerelease,
					Assets:     []githubAsset{{Name: testAsset, DownloadURL: srv.URL + "/download/" + rel.tag}},
				})
			}
			json.NewEncoder(w).Encode(list)
			return
		}

		g.downloads++
		tag := strings.TrimPrefix(r.URL.Path, "/download/")
		var buf bytes.Buffer
		archive := zip.NewWriter(&buf)
		file, _ := archive.Create("start.js")
		io.WriteString(file, "// "+tag)
		archive.Close()
		w.Write(buf.Bytes())
	}))
	t.Cleanup(srv.Close)
	return srv
}

type fakeMigrations struct {
	dirs []string
	err  error
}

func (m *fakeMigrations) run(releaseDir string) error {
	m.dirs = append(m.dirs, releaseDir)
	return m.err
}

func newUpgrader(t *testing.T, github *fakeGitHub, migrate *fakeMigrations, installed ...string) *Upgrader {
	t.Helper()

	dir := t.TempDir()
	for _, tag := range installed {
		if err := os.MkdirAll(filepath.Join(dir, "releases", tag), 0o755); err != nil {
			t.Fatal(err)
		}
	}

	srv := github.serve(t)
	return &Upgrader{
		Dir:         dir,
		ReleasesURL: srv.URL + "/releases",
		AssetName:   testAsset,
		HTTP:        srv.Client(),
		Migrate:     migrate.run,
		Out:         io.Discard,
	}
}

func releaseFolders(t *testing.T, u *Upgrader) []string {
	t.Helper()

	entries, err := os.ReadDir(filepath.Join(u.Dir, "releases"))
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, e := range entries {
		names = append(names, e.Name())
	}
	return names
}

func TestUpgradeUnpacksTheNewerReleaseAndMigratesFromIt(t *testing.T) {
	github := &fakeGitHub{releases: []fakeRelease{{tag: "v0.14.0"}, {tag: "v0.15.0"}}}
	migrate := &fakeMigrations{}
	u := newUpgrader(t, github, migrate, "v0.14.0")

	if err := u.Run(); err != nil {
		t.Fatal(err)
	}

	want := filepath.Join(u.Dir, "releases", "v0.15.0")
	body, err := os.ReadFile(filepath.Join(want, "start.js"))
	if err != nil || string(body) != "// v0.15.0" {
		t.Fatalf("start.js in %s = %q, %v; want the v0.15.0 zip", want, body, err)
	}

	if len(migrate.dirs) != 1 || migrate.dirs[0] != want+".partial" {
		t.Fatalf("migrations ran in %v, want only %s.partial", migrate.dirs, want)
	}
}

func TestUpgradeLeavesTheInstallAloneWhenItHasTheLatestRelease(t *testing.T) {
	github := &fakeGitHub{releases: []fakeRelease{{tag: "v0.14.0"}, {tag: "v0.15.0"}}}
	migrate := &fakeMigrations{}
	u := newUpgrader(t, github, migrate, "v0.15.0")

	if err := u.Run(); err != nil {
		t.Fatal(err)
	}

	if github.downloads != 0 || len(migrate.dirs) != 0 {
		t.Fatalf("downloaded %d zips and migrated %v, want neither", github.downloads, migrate.dirs)
	}
}

// The newest release folder counts as installed, so one named before its migrations succeeded would pass for it.
func TestUpgradeNamesNoReleaseFolderWhenMigrationsFail(t *testing.T) {
	github := &fakeGitHub{releases: []fakeRelease{{tag: "v0.14.0"}, {tag: "v0.15.0"}}}
	migrate := &fakeMigrations{err: errors.New("migration failed")}
	u := newUpgrader(t, github, migrate, "v0.14.0")

	if err := u.Run(); err == nil {
		t.Fatal("Run succeeded although the migrations failed")
	}
	if _, err := os.Stat(filepath.Join(u.Dir, "releases", "v0.15.0")); !os.IsNotExist(err) {
		t.Fatalf("releases/v0.15.0 exists after failed migrations: %v", err)
	}

	migrate.err = nil
	if err := u.Run(); err != nil {
		t.Fatal(err)
	}
	if len(migrate.dirs) != 2 {
		t.Fatalf("the next upgrade migrated %d times in total, want it to install v0.15.0 again", len(migrate.dirs))
	}
}

func TestUpgradeTakesReleaseCandidatesOnlyWhenAskedTo(t *testing.T) {
	github := &fakeGitHub{releases: []fakeRelease{{tag: "v0.14.0"}, {tag: "v0.15.0-rc.1", prerelease: true}}}
	migrate := &fakeMigrations{}
	u := newUpgrader(t, github, migrate, "v0.14.0")

	if err := u.Run(); err != nil {
		t.Fatal(err)
	}
	if len(migrate.dirs) != 0 {
		t.Fatalf("installed %v without --prerelease", migrate.dirs)
	}

	u.Prerelease = true
	if err := u.Run(); err != nil {
		t.Fatal(err)
	}
	if want := filepath.Join(u.Dir, "releases", "v0.15.0-rc.1.partial"); len(migrate.dirs) != 1 || migrate.dirs[0] != want {
		t.Fatalf("migrations ran in %v with --prerelease, want %s", migrate.dirs, want)
	}
}

// Release candidates and a final release order differently as text than as versions.
func TestUpgradeKeepsOnlyTheTwoNewestReleaseFolders(t *testing.T) {
	github := &fakeGitHub{releases: []fakeRelease{{tag: "v0.15.0"}}}
	u := newUpgrader(t, github, &fakeMigrations{}, "v0.15.0-rc.1", "v0.15.0-rc.2")

	if err := u.Run(); err != nil {
		t.Fatal(err)
	}

	folders := releaseFolders(t, u)
	sort.Strings(folders)
	if len(folders) != 2 || folders[0] != "v0.15.0" || folders[1] != "v0.15.0-rc.2" {
		t.Fatalf("release folders = %v, want v0.15.0 and v0.15.0-rc.2", folders)
	}
}
