# エディタ連携ガイド（Open Scene）

動画のプレイヤーにある Open Scene ボタンで、その動画に結びついたシーンを Unity か Unreal Engine で直接開けます

```
ブラウザ（Open Scene）
   ↓ videoreview://open?scene=<scenePath>
launcher（PC ごとにインストール、URL scheme を受け取る）
   ↓ 127.0.0.1:18766
エディタのプラグイン（Unity / UE の中で待ち受け、シーンを開く）
```

launcher とプラグインは、レビューする人の PC ごとに入れます  
シーンのパスは、[動画のアップロード時](#3-動画にシーンを結びつける)に紐づけます

---

## 1. launcher をインストールする

GitHub の Releases から、自分の OS の zip をダウンロードします

| OS | ファイル |
|---|---|
| Windows | `videoreview-launcher-windows-amd64.zip` |
| macOS（Apple silicon） | `videoreview-launcher-darwin-arm64.zip` |
| macOS（Intel） | `videoreview-launcher-darwin-amd64.zip` |

### Windows

1. zip を展開します
2. 展開したフォルダで PowerShell で以下を実行します

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

`%LOCALAPPDATA%\VideoReview\VideoReview Launcher\` に入り、`videoreview://` がこの launcher に登録されます

### macOS

1. zip を展開します
2. 展開したフォルダでターミナルで以下を実行します

```bash
bash build-app.sh
```

`~/Applications/VideoReview/VideoReview Launcher.app` が作られ、`videoreview://` がこのアプリに登録されます

---

## 2. エディタにプラグインを入れる

### Unity

1. `integrations/unity/VideoReviewUnity/Assets/VideoReview` フォルダを、自分のプロジェクトの `Assets/` にコピーします
2. エディタを開き直します

Console に `[VideoReview] TCP server started on port 18766` と出れば待ち受けています

※ 同梱のサンプルプロジェクトは Unity 6000.3 で作られています

### Unreal Engine

1. `integrations/ue/Plugins/VideoReview` フォルダを、自分のプロジェクトの `Plugins/` にコピーします
2. プロジェクトを開き、プラグインのビルドを求められたら Yes を選びます（C++ のプラグインなので、Visual Studio か Xcode が要ります）
3. Edit → Plugins で VideoReview が有効になっていることを確かめます

---

## 3. 動画にシーンを結びつける

動画をアップロードするときに、そのシーンのパスを `scene_path` に付けます  
メンテナンス CLI の `upload-video` で指定します（[メンテナンス CLI のガイド](../maintenance/README.jp.md)）

```bash
go run . upload-video \
  --title "Boss battle - camera check" \
  --folder_key "battle" \
  --scene_path "Assets/Scenes/Boss.unity" \
  --video_path "/path/to/video.mp4"
```

エディタごとにパスの形が決まっています

| エディタ | scene_path の形 | 例 |
|---|---|---|
| Unity | プロジェクトの `Assets/` から始まるパス | `Assets/Scenes/Boss.unity` |
| Unreal Engine | パッケージ名、または `Content/` から始まるパス | `/Game/Maps/Boss`、`Content/Maps/Boss.umap` |

---

## 4. 使い方

1. 動画を開くと、`scene_path` が付いている動画にはプレイヤーの右下にゲームパッドのアイコン（Open Scene）が出ます
2. 押すと、起動中のエディタがそのシーンを開き、前面に出ます

<img src="https://github.com/user-attachments/assets/b9c84fbc-a0a4-49ad-b038-1ee4d376fcd7" width="700" />

※ エディタを先に起動する必要があります  
※ ボタンが出ないときは、動画に `scene_path` が付いているか、管理画面の General で URL scheme が空になっていないかを確かめます（[General](admin/general.jp.md)）

---

## Reference

### API Test Window（エディタから VideoReview の API を試す）

Unity と UE のプラグインには、エディタの中から VideoReview の API を呼ぶデバッグウィンドウが入っています  
中身はメンテナンス CLI を呼んでいるので、CLI のバイナリを次の場所に置いてから使います

| エディタ | CLI を置く場所 | 開き方 |
|---|---|---|
| Unity | `Assets/VideoReview/Editor/API/bin/<Windows / Mac / Linux>/` | メニュー VideoReview → Open API Test Window |
| Unreal Engine | `Plugins/VideoReview/Source/VideoReviewEditor/bin/<Windows / Mac / Linux>/` | メニュー Window → VideoReview API Test |

Server URL と API Token を入れて Apply を押すと、動画の一覧やアップロード（scene_path 付き）などをエディタから試せます

### launcher のローカルビルド方法（開発者向け）

ビルドするために Go が必要です

##### Windows（PowerShell）
```powershell
cd integrations/launcher

# ビルド
$env:GOOS="windows"; $env:GOARCH="amd64"; go build -o installers\windows\videoreview-launcher.exe
# 下記スクリプトでインストールします
powershell -ExecutionPolicy Bypass -File .\installers\windows\install.ps1
```

##### macOS
```bash
cd integrations/launcher

# Intel Mac は GOARCH=amd64 にします
GOOS=darwin GOARCH=arm64 go build -o installers/mac/videoreview-launcher
# 下記スクリプトでインストールします
bash installers/mac/build-app.sh
```
