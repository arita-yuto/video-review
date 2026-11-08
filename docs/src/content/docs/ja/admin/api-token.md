---
title: "API Token"
sidebar:
  order: 6
---
メンテナンス CLI と AI エージェントが REST API を呼ぶときに使うトークンです  
トークンは 1 つで、admin と同じ権限を持ちます

<img src="/video-review/images/admin/api-token/api-token-section.webp" />

## 1. トークンを発行

1. Generate（発行済みなら Regenerate）を押します
2. 表示されたトークンを Ctrl+C でコピーします
3. 安全な場所に保管します

※ トークンはこのときにしか表示されません  
※ 失くした場合は再発行します  
※ トークンは 1 つしか存在できないため、再発行した時点で古いトークンは利用できなくなります

---

## 2. トークンの渡し方

| 使う場所 | 渡し方 |
|---|---|
| メンテナンス CLI | [メンテナンス CLI のガイド](/video-review/ja/features/maintenance-cli/) の手順で設定します |
| AI エージェント | [AI 機能ガイド](/video-review/ja/features/ai/) の「AI エージェントから検索」の手順で `x-api-token` ヘッダーに渡します |
| curl | `x-api-token` ヘッダーに入れます（API の一覧は `/api/docs`） |
