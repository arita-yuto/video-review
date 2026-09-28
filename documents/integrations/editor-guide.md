# Editor Integration Guide (Open Scene)

The Open Scene button in the video player opens the scene tied to that video directly in Unity or Unreal Engine.

```
Browser (Open Scene)
   ↓ videoreview://open?scene=<scenePath>
launcher (installed per PC, receives the URL scheme)
   ↓ 127.0.0.1:18766
editor plugin (listens inside Unity / UE and opens the scene)
```

The launcher and the plugin are installed on each reviewer's PC.
The scene path is tied to the video [when it is uploaded](#3-tie-a-video-to-its-scene).

---

## 1. Install the launcher

Download the zip for your OS from the GitHub Releases.

| OS | File |
|---|---|
| Windows | `videoreview-launcher-windows-amd64.zip` |
| macOS (Apple silicon) | `videoreview-launcher-darwin-arm64.zip` |
| macOS (Intel) | `videoreview-launcher-darwin-amd64.zip` |

### Windows

1. Unpack the zip.
2. Open PowerShell in the unpacked folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

It installs to `%LOCALAPPDATA%\VideoReview\VideoReview Launcher\` and registers `videoreview://` to this launcher.

### macOS

1. Unpack the zip.
2. Open a terminal in the unpacked folder and run:

```bash
bash build-app.sh
```

It creates `~/Applications/VideoReview/VideoReview Launcher.app` and registers `videoreview://` to that app.

---

## 2. Install the editor plugin

### Unity

1. Copy the `integrations/unity/VideoReviewUnity/Assets/VideoReview` folder into your project's `Assets/`.
2. Reopen the editor.

`[VideoReview] TCP server started on port 18766` in the Console means it is listening.

Note: the bundled sample project was made with Unity 6000.3.

### Unreal Engine

1. Copy the `integrations/ue/Plugins/VideoReview` folder into your project's `Plugins/`.
2. Open the project. When asked to build the plugin, choose Yes (it is a C++ plugin, so Visual Studio or Xcode is needed).
3. Check that VideoReview is enabled under Edit → Plugins.

---

## 3. Tie a video to its scene

When uploading a video, pass the scene's path as `scene_path`.
The maintenance CLI's `upload-video` takes it ([maintenance CLI guide](../../maintenance/README.md)).

```bash
go run . upload-video \
  --title "Boss battle - camera check" \
  --folder_key "battle" \
  --scene_path "Assets/Scenes/Boss.unity" \
  --video_path "/path/to/video.mp4"
```

Each editor expects its own form of path:

| Editor | Form of scene_path | Example |
|---|---|---|
| Unity | A path starting at the project's `Assets/` | `Assets/Scenes/Boss.unity` |
| Unreal Engine | A package name, or a path starting at `Content/` | `/Game/Maps/Boss`, `Content/Maps/Boss.umap` |

---

## 4. How to use

1. Open the video. A video with a `scene_path` shows a gamepad icon (Open Scene) at the bottom right of the player.
2. Press it. The running editor opens that scene and comes to the front.

<img src="https://github.com/user-attachments/assets/b9c84fbc-a0a4-49ad-b038-1ee4d376fcd7" width="700" />

Note: the editor must be running beforehand.  
Note: if the button is missing, check that the video has a `scene_path` and that the URL scheme in Administration → General is not empty ([General](../admin/general.md)).

---

## Reference

### API Test Window (call the VideoReview API from the editor)

Both plugins include a debug window that calls the VideoReview API from inside the editor.
It runs the maintenance CLI under the hood, so put the CLI binary in place first:

| Editor | Where the CLI goes | How to open |
|---|---|---|
| Unity | `Assets/VideoReview/Editor/API/bin/<Windows / Mac / Linux>/` | Menu VideoReview → Open API Test Window |
| Unreal Engine | `Plugins/VideoReview/Source/VideoReviewEditor/bin/<Windows / Mac / Linux>/` | Menu Window → VideoReview API Test |

Enter the Server URL and the API Token, press Apply, and you can list videos or upload one (with a scene_path) from the editor.

### Build the launcher locally (for developers)

Go is required to build.

##### Windows (PowerShell)
```powershell
cd integrations/launcher

# Build
$env:GOOS="windows"; $env:GOARCH="amd64"; go build -o installers\windows\videoreview-launcher.exe
# Install with the script below
powershell -ExecutionPolicy Bypass -File .\installers\windows\install.ps1
```

##### macOS
```bash
cd integrations/launcher

# On an Intel Mac, use GOARCH=amd64
GOOS=darwin GOARCH=arm64 go build -o installers/mac/videoreview-launcher
# Install with the script below
bash installers/mac/build-app.sh
```

### Check the plugins build (for developers)

On Windows, you can check that the Unity and UE plugins build.
Each script uses the newest editor installed.

```powershell
powershell -ExecutionPolicy Bypass -File .\integrations\build-unity.ps1
powershell -ExecutionPolicy Bypass -File .\integrations\build-ue.ps1
```

Note: Unity needs you to be signed in to Unity Hub.
