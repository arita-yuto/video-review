# Editor Integration Guide (Open Scene)

The Open Scene button in the video player opens the scene tied to that video directly in Unity or Unreal Engine.

This is how it works:

```
Browser (Open Scene)
   ↓ videoreview://open?scene=<scenePath>
launcher (installed per PC, receives the URL scheme)
   ↓ 127.0.0.1:18766
editor plugin (listens inside Unity / UE and opens the scene)
```

The launcher and the plugin are installed on each reviewer's PC.
The scene path is attached by whoever uploads the video.

---

## 1. Install the launcher (per PC)

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

## 2. Install the editor plugin (per PC)

### Unity

1. Copy the `integrations/unity/VideoReviewUnity/Assets/VideoReview` folder of this repository into your project's `Assets/`.
2. Reopen the editor.

`[VideoReview] TCP server started on port 18766` in the Console means it is listening.

Note: the bundled sample project was made with Unity 6000.3.

### Unreal Engine

1. Copy the `integrations/ue/Plugins/VideoReview` folder of this repository into your project's `Plugins/`.
2. Open the project. When asked to build the plugin, choose Yes (it is a C++ plugin, so Visual Studio or Xcode is needed).
3. Check that VideoReview is enabled under Edit → Plugins.

---

## 3. Tie a video to its scene

When uploading a video, pass the scene's path as `scene_path`.
The maintenance CLI's `upload-video` takes it ([maintenance CLI guide](../maintenance/README.md)).

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

## 4. Use it

1. Open the video. A video with a `scene_path` shows a gamepad icon (Open Scene) at the bottom right of the player.
2. Press it. The running editor opens that scene and comes to the front.

Note: with unsaved changes in the editor, you are asked to save first.
Note: the plugin only reaches a running editor, so start the editor beforehand.
Note: if the button is missing, check that the video has a `scene_path` and that the URL scheme in Administration → General is not empty ([General](admin/general.md)).

---

## Reference

### API Test Window (call the VideoReview API from the editor)

Both plugins include a debug window that calls the VideoReview API from inside the editor.
It runs the maintenance CLI under the hood, so put the CLI binary in place first:

| Editor | Where the CLI goes | How to open |
|---|---|---|
| Unity | `Assets/VideoReview/Editor/API/bin/<Windows / Mac / Linux>/` | Menu VideoReview → Open API Test Window |
| Unreal Engine | `Plugins/VideoReview/Source/VideoReviewEditor/bin/<Windows / Mac / Linux>/` | Level Editor menu → VideoReview API Test |

Enter the Server URL and the API Token, press Apply, and you can list videos or upload one (with a scene_path) from the editor.
