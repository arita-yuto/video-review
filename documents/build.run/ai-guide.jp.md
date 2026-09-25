# AI 機能ガイド

AI 機能は任意ですが、有効にすると VCS「コード変更」パネルの AI 要約、チャット検索、AI エージェントからの検索が使えます

---

## 1. LLM プロバイダーを設定する（管理者）

### プロバイダーを選ぶ

| | Claude / ChatGPT / Gemini | Ollama（ローカル） |
|---|---|---|
| プライバシー | 動画のタイトル、コメント、PR 情報を外に送信 | 完全ローカル、外部送信なし |
| 精度 | 高い | モデルに依存 |
| コスト | トークン課金 | 無料（ハードウェアコストのみ） |
| セットアップ | API キーのみ | Ollama の起動とモデルのダウンロードが必要 |
| チャット検索 | 利用可 | モデルがツール呼び出しに対応している必要がある（`qwen2.5` を推奨） |
| 推奨用途 | 本番環境、チーム利用 | ローカル、オフライン環境 |

### 設定して保存する

管理者でログインし、左下の歯車アイコン → Administration → AI を開きます

1. Provider で使いたいAIを選びます
2. API key（Ollama の場合は Base URL）と Model を入力します
3. Test & save を押します

<img src="https://github.com/user-attachments/assets/4b427a54-fade-4aca-89a7-b71b27a7901b/"/>

接続に成功した設定だけが保存され、使用中 `●` になります  
別のAIに切り替えるときは、「この Provider を使う」から可能です

| Provider | API key の取得先 | Model の例 |
|---|---|---|
| Claude | https://console.anthropic.com/ | `claude-haiku-4-5-20251001`、`claude-sonnet-4-6` |
| OpenAI | https://platform.openai.com/ | `gpt-5-mini`、`gpt-5` |
| Gemini | https://aistudio.google.com/ | `gemini-2.0-flash` |
| Ollama | 不要（Base URL を入力） | `qwen2.5:3b`（GPU 4GB 級）、`qwen2.5:7b`（GPU 8GB 級以上、または CPU） |

※ Ollama のモデルは GPU の VRAM に収まる大きさを選びます（収まらないと読み込みに失敗します）

### Ollama を用意する

----
#### Docker

Ollama コンテナは `compose.prod.ollama.yml` に定義されています  
CPU / NVIDIA / AMD のどれで動かすかを `--profile` で選びます

##### CPU
```bash
docker compose -f compose.prod.yml -f compose.prod.ollama.yml --profile cpu up -d
```

##### GPU(Nvidia)
[NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) をインストールする必要があります
```bash
docker compose -f compose.prod.yml -f compose.prod.ollama.yml --profile nvidia up -d
```

##### GPU(Radion)
```bash
docker compose -f compose.prod.yml -f compose.prod.ollama.yml --profile rocm up -d
```

##### モデルをダウンロードする
```bash
# 2. モデルをダウンロード（初回のみ、Docker ボリュームに保存される）
docker exec videoreview-ollama ollama pull qwen2.5:3b
```

Base URL には `http://ollama:11434` を入力します

<img width="500" src="https://github.com/user-attachments/assets/6054972e-732b-4179-9ae6-d08e7f97fbd7/" />

----
#### Local / On‑premise

```bash
# 1. Ollama をインストール: https://ollama.com/download
# 2. モデルをダウンロード（初回のみ、~/.ollama/models に保存される）
ollama pull qwen2.5:3b
```

Base URL には `http://localhost:11434` を入力します

<img width="500" src="https://github.com/user-attachments/assets/d677060f-b454-4813-9127-36750992a0ee/" />

----

## 2. アプリ内チャット検索を使う

### 質問する

動画一覧のヘッダーのチャットアイコンを押し、質問を入力して Enter を押します  
※ ゲストでログインしている場合は使えません

<img width="649" src="https://github.com/user-attachments/assets/796373bd-0c99-4259-8f1f-2afdddb31d88/" />

<br>
アップロード日、タイトル、タグ、コミットコメントなどから、検索が可能です <br>

- 「最近アップロードされた動画を 3 件教えて」
- 「描画付きのコメントがある動画は？」
- 「ドラゴンのボス動画の最新リビジョンに入ったコード変更は？」

<img src="https://github.com/user-attachments/assets/82679465-046f-45c4-94cf-40b8bb8dc41b"/>

## 3. AI エージェントから使う

VideoReview は、動画、コメント、コード変更を読むツールを MCP（Model Context Protocol）で `http://<VideoReview のアドレス>/api/v1/mcp` に公開しています  
利用者ごとに、自分の AI エージェント（Claude Code、Codex CLI、Gemini CLI など）をこの URL に登録します

### API トークンを発行する

管理者にAPIトークンを発行してもらい、共有してもらう必要があります  
Administration → API Token から発行します（[管理画面ガイド](../admin/api-token.jp.md)）  
エージェントはこのトークンを `x-api-token` ヘッダーに付けて VideoReview に接続します

### 登録する

Claude Code
```bash
claude mcp add --transport http video-review http://videoreview.internal:3489/api/v1/mcp -H "x-api-token: <API トークン>"
```

`mcp list` コマンドで確認する
```bash
claude mcp list
```

Codex CLI

`codex mcp add` の `--bearer-token-env-var` は `Authorization` ヘッダー用なので、`x-api-token` は `~/.codex/config.toml` に書きます

```toml
[mcp_servers.video-review]
url = "http://videoreview.internal:3489/api/v1/mcp"
env_http_headers = { "x-api-token" = "VIDEO_REVIEW_API_TOKEN" }
```

シェルに `VIDEO_REVIEW_API_TOKEN` を設定して `codex` を起動します

`mcp list` コマンドで確認する
```bash
codex mcp list
```

Gemini CLI

```bash
gemini mcp add --transport http -H "x-api-token: <API トークン>" video-review http://videoreview.internal:3489/api/v1/mcp
```

`mcp list` コマンドで確認する
```bash
gemini mcp list
```

## 4. 前提知識をカスタマイズする

ツールの使い分けや日付の解釈といった一般的な前提は VideoReview に組み込まれています  
チーム固有の前提は管理画面に書きます  
書いた内容はチャット検索と AI エージェントの両方に渡ります

### ノートを書く

Administration → MCP を開き、テキストボックスに書いて保存します

<img src="https://github.com/user-attachments/assets/0c00e3cc-49e6-48e3-a030-b6036acbb0f6"/>


### タグやフォルダの意味、担当、回答の形式、よく聞く質問の言い回しなどを書きます
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

## 参考

### ツール一覧

VideoReview が MCP で提供するツールです  
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
| エージェントの接続が `HTTP 401` になる | `x-api-token` ヘッダーが無いか、トークンが違うか失効している（発行し直す） |
| エージェントから接続できない | 登録した URL が違うか、VideoReview に到達できない（同じアドレスをブラウザで開けるか確かめる） |
| `list_vcs_changes` が `from` を要求する | 最初のリビジョンには比較対象が無い（その動画の VCS パネルを一度開くか、後のリビジョンについて聞く） |
