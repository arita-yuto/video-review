---
title: "SSO (OIDC)"
sidebar:
  order: 2
---
OpenID Connect に対応した IdP（OneLogin、Okta、Microsoft Entra ID、Keycloak など）に接続すると、ログイン画面に SSO タブが出ます  
利用者は IdP のアカウントでログインし、VideoReview のユーザーが自動で作られます

<img src="/video-review/images/admin/integrations/sso/sso-section.webp" />

---

## 1. IdP にアプリを登録

IdP の管理者に、VideoReview を OpenID Connect のアプリとして登録してもらいます

1. Administration の SSO (OIDC) セクションを開き、Callback URL 欄の値をコピーします
2. IdP の管理者に渡し、アプリの Redirect URI に入れてもらいます
3. 登録ができたら、Issuer URL、Client ID、Client Secret を受け取ります

※ IdP は Redirect URI に https を求めるので、先に [https ガイド](/video-review/ja/install/https/) の手順で VideoReview を https にします

---

## 2. Test & save で接続

登録後、IdP の管理者から受け取ったものを入力します

| 項目 | 内容 |
|---|---|
| Callback URL | IdP に登録する URL（この画面を開いている URL から作られるので、入力はしません） |
| Issuer URL | IdP から受け取った OpenID Connect の URL（OneLogin なら `https://<サブドメイン>.onelogin.com/oidc/2`） |
| Client ID | IdP から受け取った、登録したアプリの ID |
| Client Secret | IdP から受け取った、登録したアプリのシークレット |

1. Issuer URL、Client ID、Client Secret を入力します
2. Test & save を押します

Test & save を押し、Issuer URL の OpenID 設定を取り、Client ID と Client Secret が IdP に通ることを確かめ、成功したら保存されます  
保存するとログイン画面に SSO タブが出ます

※ Client Secret を保存すると Issuer URL と Client Secret は変えられなくなるので、変えるときは Reset で保存した設定を消してから入れ直します  
※ ログイン画面が SSO タブで開くようにするには、[General](/video-review/ja/admin/general/) のログイン画面の既定タブを SSO にします

---

## 3. SSO でログイン

<img src="/video-review/images/admin/integrations/sso/sign-in-with-sso.webp" width="400" />

1. ログイン画面の SSO タブで Sign in with SSO を押します
2. IdP のログイン画面でログインします
3. VideoReview に戻り、ログインした状態になります

初めてログインした人は、IdP のメールアドレスと名前で viewer のユーザーが作られます  
role を変えるときは [Users](/video-review/ja/admin/users/) で変えます

同じメールアドレスのユーザーが既に VideoReview にいるときは、そのユーザーでログインします  
2 回目からは IdP のアカウントで結びつくので、IdP 側でメールアドレスが変わっても同じユーザーのままです

※ IdP がメールアドレスを確認済みにしていない人は、初回のログインが拒否されます（IdP 側でメールアドレスを確認済みにします）  
※ Users で active を `false` にした人は、IdP でログインできても VideoReview には入れません

---

## 参考: Keycloak で動作確認

リポジトリに Keycloak の設定が入っているので、IdP が無くても SSO のログインを試せます

```bash
docker compose --profile keycloak up -d
```

Administration の SSO (OIDC) セクションに次を入れて Test & save を押します

| 項目 | 値 |
|---|---|
| Issuer URL | `http://keycloak:8080/realms/videoreview` |
| Client ID | `videoreview` |
| Client Secret | `videoreview-secret` |

ブラウザで `http://127.0.0.1:3489` を開き、SSO タブからユーザー `test`（パスワード `test`）でログインします  
Keycloak の管理画面は `http://127.0.0.1:8081`（admin / admin）です

※ Issuer URL はサーバーが Keycloak に届くアドレスなので、web コンテナから見た `keycloak:8080` を書きます  
※ 止めると Keycloak の中のデータは消えます

```bash
docker compose --profile keycloak down
```
