<div align="center">

  <h1>VideoReview</h1>

  <p>
    ゲーム開発チームのための、自社のストレージで動く Frame.io
  </p>

  <p>
    <a href="./README.md"><img alt="English README" src="https://img.shields.io/badge/README-English-ff69b4?style=for-the-badge" /></a>
  </p>

  <p>
    <a href="https://github.com/arita-yuto/video-review/stargazers"><img src="https://img.shields.io/github/stars/arita-yuto/video-review?style=social" alt="GitHub stars" /></a>
    &nbsp;&nbsp;
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  </p>

  <img src="https://github.com/user-attachments/assets/f20801d1-845d-4279-9c57-aca98e9bc16c" alt="VideoReview：コメント、フレームへの描き込み、リビジョンの比較" width="880" />

</div>

## レビュー

<table>
  <tr>
    <td width="50%" valign="top">
      <b>動画に直接、描き込む</b><br/>
      場所を言葉で説明せず、止めたフレームに直接描けます<br/><br/>
      <img src="https://github.com/user-attachments/assets/caf847d0-be43-4d89-b843-600b733a0731" width="400" alt="止めたフレームに描き込む" />
    </td>
    <td width="50%" valign="top">
      <b>リビジョンを見比べる</b><br/>
      グラフィックスの更新による差異をすぐ発見できます<br/><br/>
      <img src="https://github.com/user-attachments/assets/8fd74149-bea6-492d-b789-30f4c23e7ba1" width="400" alt="2 つのリビジョンと、その下の差分画像" />
    </td>
  </tr>
</table>

## ゲーム開発のために

<table>
  <tr>
    <td width="33%" valign="top">
      <b>変更の中身を見る</b><br/>
      動画の変更がどの更新が原因になったのかをWebですぐに確認できます<br/><br/>
      <img src="https://github.com/user-attachments/assets/a282f05e-ff74-4406-948d-6cdf9ae27181" width="260" alt="コミットと PR が並ぶ Changes タブ" />
    </td>
    <td width="33%" valign="top">
      <b>Unity / Unreal Engine</b><br/>
      レビュー中の動画からシーンを開き、エディターですぐに確認できます<br/><br/>
      <img src="https://github.com/user-attachments/assets/b9c84fbc-a0a4-49ad-b038-1ee4d376fcd7" width="260" alt="エディタでシーンを開く" />
    </td>
    <td width="33%" valign="top">
      <b>Slack / Jira</b><br/>
      コメントを放置されないようにSlack連携、タスク化もワンクリックでできます<br/><br/>
      <img src="https://github.com/user-attachments/assets/d5a23dba-b83b-4927-b202-a0079e339755" width="260" alt="コメントを Slack と Jira に送る" />
    </td>
  </tr>
</table>

**オンプレミスで動く**：未公開の映像を社外に出さずにレビューできます（S3 や Nextcloud にも置けます）  
**ほかにも**：検索 · [AI チャット検索](./documents/build.run/ai-guide.jp.md#2-アプリ内チャット検索を使う) · [MCP](./documents/build.run/ai-guide.jp.md#3-ai-エージェントから使う) · [メンテナンス CLI](./maintenance/README.jp.md)

## Quick Start (Docker)

```bash
git clone --depth 1 https://github.com/arita-yuto/video-review.git
cd video-review
docker compose -f compose.prod.yml up -d
```

http://localhost:3489 を開き、管理者アカウントを作成します

## ドキュメント

### 起動方法

- [Docker ガイド](./documents/build.run/docker-guide.jp.md)
- [Local / On‑premise ガイド](./documents/build.run/local-guide.jp.md)

### 設定・連携

- [管理画面ガイド](./documents/admin/README.jp.md)
- [AI 機能ガイド](./documents/build.run/ai-guide.jp.md)
- [エディター連携ガイド](./documents/integrations/editor-guide.jp.md)
- [VCS 連携](./documents/admin/integrations/vcs.jp.md)

## 導入の相談・Contributing・License

- 導入や既存ツールとの連携で困ったら、気軽に相談してください！ videoreview.contact.info@gmail.com
- [CONTRIBUTING.jp.md](./CONTRIBUTING.jp.md) を参照してください
- MIT License
