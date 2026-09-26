# VCS

リポジトリに接続すると、動画のサイドパネルの Changes タブに、そのリビジョンに結びつくコミットと Pull Request が出ます  
AI 機能を有効にしていると、その要約も出ます（[AI 機能ガイド](../../build.run/ai-guide.jp.md)）

<img src="ここにvcsの画像を張る">

## 2. 接続して保存する

| 項目 | 内容 |
|---|---|
| Provider | GitHub |
| Owner | リポジトリのオーナー（組織名かユーザー名） |
| Repository | リポジトリ名 |
| Token | リポジトリを読める Personal access token |
| Branch | コミットを辿るブランチ（例 `main`） |

1. Provider を選び、項目を入力します
2. Test & save を押します

リポジトリに接続できた設定だけが保存され、その Provider が使用中 `●` になります  
別の vcs  に切り替えるときは `この Provider を使う` を押します

※ Token を保存すると Owner、Repository、Token は変えられなくなるので、変えるときは Reset で消してから入れ直します

---

## 3. 動画に結びつける

動画をアップロードするときに、その動画に関係するパスを渡します  
メンテナンス CLI のアップロードで指定します（[メンテナンス CLI のガイド](../../../maintenance/README.jp.md)）

Changes タブは、前のリビジョンからこのリビジョンまでの間に、そのパスに触れたコミットと Pull Request を出します

