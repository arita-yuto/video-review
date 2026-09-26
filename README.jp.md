<!-- HERO -->
<div align="center">

  <h1>VideoReview</h1>

  <p>
    A self-hosted video review hub for small-to-mid teams.
    <br/>
    Comment on timelines, draw on frames, and connect feedback to action.
  </p>

  <p align="center">
    <a href="https://github.com/arita-yuto/video-review/stargazers">
      <img src="https://img.shields.io/github/stars/arita-yuto/video-review?style=social" alt="GitHub stars" />
    </a>
    &nbsp;&nbsp;
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
    </a>
  </p>
</div>
<hr/>
<!-- One-liner + bullets -->
<h3>What it is</h3>

<p>
  VideoReviewは、動画レビューを「見るだけ」で終わらせないための
  <b>セルフホスト型の動画レビュー Web サービス</b>です。<br/>
  動画をアップロードし、タイムライン上にコメントを残したり
  フレームに直接描き込みながらSNSのようにフィードバックを共有できます
</p>

<p>
  <b>Slack</b> や <b>Jira</b> と連携し
  レビューで出た課題を次のワークフローへ自然につなげることができます。<br/>
  また、特定のツールやエンジンに依存しない設計となっており
  既存の制作ワークフローに合わせて拡張していくことを前提としています
</p>

<p>
  ゲーム開発や映像制作など制作現場における
  <b>チーム内レビュー</b>を想定して設計されています
</p>

<!-- Screenshot -->
<p align="center">
  <img src="https://github.com/user-attachments/assets/532f55eb-0f47-45aa-b17c-2e7a8bb5e191" alt="VideoReview screenshot" width="1280" />
</p>

# Need help setting it up?

オンプレミス構成や既存ツールとの連携など、導入時の相談や検証のサポートも可能です  
必要であればこちらまでご連絡ください

videoreview.contact.info@gmail.com

## 🤝 Contributing

参加方法は [CONTRIBUTING.jp.md](./CONTRIBUTING.jp.md) を参照してください

# ✨ Key Features

## Flexible Deployment: On-premise or Cloud
VideoReviewはオンプレミス環境での運用を前提に設計しています  
社内ネットワーク内で動画を完結させることで、機密性の高い映像素材を外部に出さずにレビューすることができます 

一方で運用やチーム構成に応じて以下のサービスをストレージとして選択することも可能です
- AWS S3
- NextCloud 

オンプレ・クラウドを用途に応じて使い分けることで、セキュリティ・導入コスト・運用負荷のバランスを柔軟に取れます  

---

## Actionable Comment Panel

コメント一覧は、SNSライクで直感的なUIを採用しています

- 描画付きコメント
- チケット連携されたコメント
- 新着コメント

これらはバッジや色分けによって強調され、読む前に一目で分かります

#### 動画に直接お絵かきできます

<img src="https://github.com/user-attachments/assets/47c65756-c12c-40f6-b67b-c826a5d021d0" width="700" />

気になる箇所は、言葉で説明する代わりにフレームへ直接描き込めます

1. 動画を止めてコメントを投稿します
2. そのコメントのメニューから Edit を選ぶと、動画の上に描けるようになります
3. 左上のツールでペンと消しゴムを切り替え、太さと色を選んで描きます
4. コメントを保存すると、描き込みがそのコメントに付き、再生時に同じ時刻で表示されます


## Never Miss Feedback with Slack & JIRA

VideoReview は、Slack や Jira と連携することで
レビュー中に生まれたフィードバックをそのまま普段のワークフローにつなげます  
コメントは自然に議論や作業に引き継がれ
「あとで対応しよう」が埋もれてしまうことを防ぎます

---

#### Slack & Jira Integration

<img src="https://github.com/user-attachments/assets/d5a23dba-b83b-4927-b202-a0079e339755" width="700" />

レビュータイムライン上のコメントを、
Slack へ共有したり、Jira のチケットとして起票することができます  
ツールを行き来せずに、
フィードバックをそのままタスクに変換できます

---

#### カスタムプロトコルによる Unity 連携

<img src="https://github.com/user-attachments/assets/b9c84fbc-a0a4-49ad-b038-1ee4d376fcd7" width="700" />

動画レビューに紐づいたファイルやシーンを直接開けるため、
レビュー後の修正作業までスムーズにつながります

# ✨ Advanced Features

## Powerful Search for Review Workflow

動画、コメント、イベントをそれぞれ別の条件で検索できます

- 動画: コメントの有無、チケットや描画の有無、コメントした人、本文、コメント日、動画の更新日
- コメント: 本文、日付、描画やチケットの有無、書いた人
- イベント: 台詞や字幕などのテキスト、種類、リンクの有無

「先週 A さんが描画付きで指摘した動画」「このセリフが出てくる動画」のような探し方が、条件を組み合わせるだけでできます  
日々のレビューから、後日の振り返りまで必要な情報にすぐたどり着けます

<img src="https://github.com/user-attachments/assets/cccd3a3c-2d50-4963-85a5-6659d4a6b972" width="700" />

## Ask in Plain Language: AI Chat Search

条件を組み立てる代わりに、そのまま質問できます

- 「先月レビューが集中した動画は？」
- 「未対応の指摘が残っている動画を教えて」
- 「このリビジョンで何が変わった？」

AI が動画アップロード日、タグ、コメント、コード変更を横断して答えます

<img src="https://github.com/user-attachments/assets/82679465-046f-45c4-94cf-40b8bb8dc41b" width="30%" />

同じ検索は MCP でも公開しているので、Claude Code や Codex CLI、Gemini CLI などの AI エージェントからも VideoReview に質問できます

LLM は Claude / OpenAI / Gemini のほか、Ollama でローカル完結にもできます（[AI 機能ガイド](./documents/build.run/ai-guide.jp.md)）

## See the Code Behind Every Revision

リポジトリを接続すると、動画のサイドパネルの Changes タブに、前のリビジョンからこのリビジョンまでに入ったコミットと Pull Request が並びます

- 動画に紐づけたパスに触れた変更だけを表示し、関係の薄いものは畳んでおく
- AI 機能を有効にすると、変更内容の要約も出る

<img src="https://github.com/user-attachments/assets/ebe41883-3720-4b3f-9bc1-3177e36f3bbd" width="320" />

「この見た目の変化はどの変更のせいか」を、レビューの画面から離れずに追えます（[VCS 設定](./documents/admin/integrations/vcs.jp.md)）

## Built for Production Pipelines

実際の制作パイプラインに組み込めることを前提に設計されています

管理者向けの [メンテナンス CLI](./maintenance/README.jp.md) を提供しており、  
ユーザー管理やデータ操作をスクリプトから実行できます  
また、API 経由で動画をアップロードできるため、  
DCC ツールや自動テスト、CI などから直接連携することが可能です

以下は、動画をアップロードするコマンド例になります
```bash
go run . upload-video \
  --title "title" \
  --folder_key "folder_key" \
  --scene_path "scene_path" \
  --video_path "/path/to/video.mp4"
```

## Roadmap

VideoReview は、制作現場で使われ続けることを前提に  
少しずつ改善・拡張していく予定です

今後も以下の考え方を軸に開発を進めます

- オンプレミスを前提とした構成と運用
- 既存のワークフローに自然に組み込める連携
- レビューを「次のアクション」につなげる設計
- 制作パイプラインへの組み込みや自動化への配慮

---

## Getting Started

### Quick Start (Docker)

```bash

# 1. 環境変数ファイルコピー
cp .example.env .env

# 2. 公開イメージの取得
docker compose -f compose.prod.yml pull

# 3. DBを起動
docker compose -f compose.prod.yml up -d db

# 4. DB構築 (初回起動、またはschemaが更新されたとき)
docker compose -f compose.prod.yml run --rm videoreview npm run prisma:deploy

# 5. サービス起動
docker compose -f compose.prod.yml up -d

```

### Access

- Web UI  
  http://localhost:3489

- API Documentation (Swagger)  
  http://localhost:3489/api/docs

### 初回起動

初回アクセス時に Web UI から管理者を登録します
以降のユーザー、動画、連携、API Token の管理は Web UI の Administration で行います

手順は [管理画面ガイド](./documents/admin/README.jp.md) にあります

---

## 📘 More Setup Options

詳しいビルドオプションなどは、以下のドキュメントを参照してください
* [Docker Prod / Devlopment Build Guide](./documents/build.run/docker-guide.jp.md)
* [Local / On‑premise Build Guide](./documents/build.run/local-guide.jp.md)
* [AI Features Guide](./documents/build.run/ai-guide.jp.md)
* [管理画面ガイド](./documents/admin/README.jp.md)

## License

このプロジェクトは **MIT License** のもとで公開されています  
詳しくは [LICENSE](./LICENSE) をご確認ください
