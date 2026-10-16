# https ガイド

VideoReview の前に nginx を置き、`https://<サーバー名>/` で使えるようにする手順です  

※ CA が発行した証明書を既に持っている場合は「2. 証明書を置く」から読んでください

## 1. サーバー名と証明書を用意する

- サーバー名（`videoreview.example.com` など）、利用者のブラウザからこの名前で VideoReview のサーバーに届くこと
- その名前の証明書（PEM 形式、中間証明書があれば連結したもの）
- 証明書の秘密鍵（PEM 形式）

### 自己署名の証明書を作る

CA の証明書が無い場合は、サーバー名を入れて次のコマンドで作ります

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -subj "/CN=videoreview.example.com" \
  -addext "subjectAltName=DNS:videoreview.example.com" \
  -keyout privkey.pem -out fullchain.pem
```

※ 自己署名の証明書はブラウザが知らない発行元なので、警告が出ます  

## 2. 証明書を置く

リポジトリ直下に `certs/` を作り、証明書と秘密鍵を次の名前で置きます

```
certs/fullchain.pem
certs/privkey.pem
```

## 3. nginx を起動する

### Docker

`https` プロファイルを付けて起動します

```bash
docker compose -f compose.prod.yml --profile https up -d
```

### Local / On‑premise

VideoReview と同じサーバーに nginx を入れ、`docker/nginx/videoreview.conf` を nginx の設定ファイルとして置きます  
（Linux なら `/etc/nginx/conf.d/videoreview.conf`）

設定ファイルの先頭にある `upstream` を、同じサーバーで動く VideoReview に向けます

```nginx
upstream videoreview {
    server 127.0.0.1:3489;
}
```

証明書のパス（`/etc/nginx/certs/fullchain.pem` と `privkey.pem`）も `certs/` を置いた場所に合わせます

nginx を再起動します

### 確認する

ブラウザで `https://<サーバー名>/` を開き、ログイン画面が出れば完了です

※ nginx 以外の逆 proxy を使う場合は、`X-Forwarded-Proto` と `X-Forwarded-Host` を VideoReview に渡してください
