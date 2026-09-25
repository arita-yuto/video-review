# AI 機能ガイド

AI 機能は任意ですが、有効にすると VCS「コード変更」パネルの AI 要約、チャット検索 が使えます

---

## 1. LLM プロバイダーを設定する

### プロバイダーを選ぶ

| | Claude / ChatGPT / Gemini | Ollama（ローカル） |
|---|---|---|
| プライバシー | 動画のタイトル、コメント、PR 情報を外に送信 | 完全ローカル、外部送信なし |
| 精度 | 高い | モデルに依存 |
| コスト | トークン課金 | 無料（ハードウェアコストのみ） |
| セットアップ | API キーのみ (VideoReview-Webで利用する場合) | Ollama の起動とモデルのダウンロードが必要 |
| チャット検索 | 利用可 | モデルがツール呼び出しに対応している必要がある（`llama3.1:8b` は確認で失敗） |
| 推奨用途 | 本番環境、チーム利用 | ローカル、オフライン環境 |

### 共通設定

`.env` に書きます

```env
# "claude" / "openai" / "gemini" / "ollama"
VIDEO_REVIEW_LLM_PROVIDER=claude

# モデル名
# Claude:  claude-haiku-4-5-20251001 / claude-sonnet-4-6
# OpenAI:  gpt-5-mini / gpt-5
# Gemini:  gemini-2.0-flash
# Ollama:  llama3.1:8b / gemma3:12b
VIDEO_REVIEW_LLM_MODEL=claude-haiku-4-5-20251001
```

### Claude の設定

```env
VIDEO_REVIEW_LLM_API_KEY=sk-ant-...
```

API キーの取得先: https://console.anthropic.com/

### OpenAI（ChatGPT）の設定

```env
VIDEO_REVIEW_LLM_API_KEY=sk-...
```

API キーの取得先: https://platform.openai.com/

### Gemini の設定

```env
VIDEO_REVIEW_LLM_API_KEY=AIza...
```

API キーの取得先: https://aistudio.google.com/

### Ollama の設定

#### Docker

Ollama コンテナは `compose.prod.ollama.yml` に定義されています

```bash
# 1. Ollama コンテナを起動
docker compose -f compose.prod.yml -f compose.prod.ollama.yml up -d ollama

# 2. モデルをダウンロード（初回のみ、Docker ボリュームに保存される）
docker exec videoreview-ollama ollama pull llama3.1:8b
```

```env
VIDEO_REVIEW_LLM_BASE_URL=http://ollama:11434
VIDEO_REVIEW_LLM_MODEL=llama3.1:8b
```

#### Local / On‑premise

```bash
# 1. Ollama をインストール: https://ollama.com/download
# 2. モデルをダウンロード（初回のみ、~/.ollama/models に保存される）
ollama pull llama3.1:8b
```

```env
VIDEO_REVIEW_LLM_BASE_URL=http://localhost:11434
VIDEO_REVIEW_LLM_MODEL=llama3.1:8b
```

## 2. MCP サーバーを起動する

MCP サーバーは、VideoReview の動画、コメント、コード変更を読むツールを MCP（Model Context Protocol）で公開します  

### API トークンを発行する

VideoReview の Web UI で Settings → Edit Profile から発行します（[Admin Guide](../admin-guide.jp.md)）  
MCP サーバーはこのトークンで VideoReview の API を呼びます

### Docker

`.env` に書きます

```env
# 発行した API トークン
VIDEO_REVIEW_API_TOKEN=<API トークン>

# 利用者がブラウザで開く VideoReview の URL（回答に含めるリンクに使う）
VIDEO_REVIEW_PUBLIC_URL=http://videoreview.internal:3489
```

起動します

```bash
# 開発用
docker compose -f compose.yml up -d --build mcp

# 本番用（web サービスにも MCP の設定が入るので、サービス名を付けずに起動する）
docker build -t videoreview-mcp:latest -f docker/mcp/Dockerfile .
docker compose -f compose.prod.yml -f compose.prod.mcp.yml up -d
```

※ Ollama を使う場合は `-f compose.prod.ollama.yml` も付けます  
`docker compose -f compose.prod.yml -f compose.prod.mcp.yml -f compose.prod.ollama.yml up -d`

### Local / On‑premise

`.env` に書きます

```env
# 発行した API トークン
VIDEO_REVIEW_API_TOKEN=<API トークン>

# 利用者がブラウザで開く VideoReview の URL（回答に含めるリンクに使う）
VIDEO_REVIEW_PUBLIC_URL=http://videoreview.internal:3489

# MCP サーバーが VideoReview の API を呼ぶアドレス
VIDEO_REVIEW_SERVER_URL=http://localhost:3489
```

ビルドして起動します

```bash
npm run mcp:build
npm run mcp:run -- --http
```

※ ポートは既定で 3490 です  
別のポートにするときは `npm run mcp:run -- --http 4000` のように番号を付けます  
`--` を省くと npm が `--http` を受け取ってしまい、stdio で起動します

### 確認する

起動ログに次の行が出れば成功です

```
MCP server listening on http://0.0.0.0:3490/mcp
```

## 3. アプリ内チャット検索を有効にする

### web サーバーに MCP サーバーの場所を設定する

Docker の場合は設定不要です（`compose.yml` と `compose.prod.mcp.yml` が web サービスに設定済みです）

Local / On‑premise の場合は `.env` に書きます

```env
VIDEO_REVIEW_MCP_URL=http://localhost:3490/mcp
```

### 確認する

web サーバーを起動し直し、管理者でログインします  
動画一覧のヘッダー（検索アイコンの隣）にチャットアイコンが出れば有効です

アイコンが出ない場合は、左下の歯車アイコンから設定を開きます  
「AI 検索（チャット）」の行に理由が表示されます（管理者のみ）


## 4. AI エージェントから使う

利用者ごとに設定します  
起動した MCP サーバーに、各自の AI エージェント（Claude Code、Codex CLI、Gemini CLI など）から接続します

※ API トークンは不要です（MCP サーバーが持っています）

### 登録する

Claude Code

```bash
claude mcp add --transport http video-review http://videoreview.internal:3490/mcp
```

※ VideoReview のリポジトリで作業する場合は登録不要です  
※ リポジトリの `.mcp.json` が環境変数 `VIDEO_REVIEW_MCP_URL` を読んで接続するので、シェルに `export VIDEO_REVIEW_MCP_URL=http://videoreview.internal:3490/mcp` を設定し、`claude` の起動時にサーバーを承認します（初回のみ）

Codex CLI

```bash
codex mcp add video-review --url http://videoreview.internal:3490/mcp
```

Gemini CLI

```bash
gemini mcp add --transport http video-review http://videoreview.internal:3490/mcp
```

### 確認する

```bash
claude mcp list
codex mcp list
gemini mcp list
```

video-review が接続済みとして表示されれば成功です

### 質問する

エージェントのセッションで、そのまま質問します

- 「VideoReview で今週アップロードされた動画を一覧して」
- 「描画付きのコメントがある動画は？」
- 「ドラゴンのボス動画の最新リビジョンに入ったコード変更は？」

回答の動画名はリンクになっていて、ブラウザで開けます

---

## 5. 前提知識をカスタマイズする

ツールの使い分けや日付の解釈といった一般的な前提はサーバーに同梱されています  
チーム固有の前提は Markdown ファイルに書き、MCP サーバーに読ませます

### ノートを書く

タグやフォルダの意味、担当、回答の形式、よく聞く質問の言い回しなどを書きます

```markdown
# タグ
- bug: QA が起票済み（チケット番号がコメントにある）
- wip: レビュー前（「完成した動画」の質問では除外する）

# フォルダ
- 05_cutscene: 演出班の担当

# 回答の形式
- 動画は 1 本 1 行、リンクと最新リビジョンの日付を付ける
- 「最近」は 2 週間以内とする

# よく聞く質問
- 「レビュー待ち」は wip タグが無く、コメントが 0 件の動画
```

### パスを設定して再起動する

MCP サーバーの `.env` にファイルのパスを書き、MCP サーバーを再起動します

```env
VIDEO_REVIEW_MCP_GUIDE_PATH=/srv/videoreview/team-notes.md
```

---

## 参考

### ツール一覧

MCP サーバーが提供するツールです  
AI が質問に応じて選んで呼ぶので、利用者が直接使うことはありません

| ツール | 取得できるもの |
|---|---|
| `list_videos` | 動画一覧（タイトル、フォルダ、タグ、アップロード日、コメント条件で絞り込み） |
| `get_video` | 1 本の動画と全リビジョン |
| `list_comments` | レビューコメント（本文、ユーザー、日付、描画、課題リンクで絞り込み） |
| `list_video_events` | 1 本の動画の解析イベント（画面内テキスト、文字起こしなど） |
| `search_videos_by_event` | 台詞や字幕に特定の文字列を含む動画 |
| `list_vcs_changes` | リビジョンに紐づく PR と commit |
| `get_vcs_summary` | コード変更の AI 要約 |
| `list_tags` | 使われている全タグ |
| `list_folders` | 使われている全フォルダ |

### トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| MCP サーバーの起動時に `Warning: VIDEO_REVIEW_API_TOKEN is not set` | `.env` が読めていないか、トークンが未設定 |
| ツールが `HTTP 401` を返す | トークンが違うか失効している（発行し直す） |
| ツールが `HTTP 404` または接続拒否 | MCP サーバーから VideoReview の API に届いていない（Local / On‑premise の場合は `VIDEO_REVIEW_SERVER_URL` を確認する） |
| 回答のリンクがブラウザで開けない | `VIDEO_REVIEW_PUBLIC_URL` が未設定 |
| エージェントから MCP サーバーに接続できない | 登録した URL が違うか、サーバーに到達できない（Claude Code をリポジトリで使う場合は `VIDEO_REVIEW_MCP_URL` が起動したシェルに無い） |
| `list_vcs_changes` が `from` を要求する | 最初のリビジョンには比較対象が無い（その動画の VCS パネルを一度開くか、後のリビジョンについて聞く） |
