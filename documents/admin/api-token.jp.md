# API Token

メンテナンス CLI と AI エージェントが REST API を呼ぶときに使うトークンです  
トークンは 1 つで、admin と同じ権限を持ちます

---

## 1. 開く

Administration → API Token を開きます  
Configured か Not configured かが表示されます

---

## 2. 発行する

1. Generate（発行済みなら Regenerate）を押します
2. 表示されたトークンを Ctrl+C でコピーします
3. 安全な場所に保管します

トークンはこのときにしか表示されません  
失くしたときは Regenerate で発行し直します  
古いトークンはその時点で使えなくなります

---

## 3. 使う

| 使う場所 | 渡し方 |
|---|---|
| メンテナンス CLI | [メンテナンス CLI のガイド](../../maintenance/README.jp.md) の手順で設定します |
| AI エージェント | [AI 機能ガイド](../build.run/ai-guide.jp.md) の「AI エージェントから使う」の手順で `x-api-token` ヘッダーに渡します |
| 自分のスクリプト | `x-api-token` ヘッダーに入れます（API の一覧は `/api/docs`） |
