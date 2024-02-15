# Misskey APIおよびinboxへのNGワードフィルター

Cloudflare Workersで動作するMisskey APIおよびActivityPub inboxへのNGワードフィルターです。

## 利用方法

1. デプロイする
  ```
  pnpm i
  pnpm run deploy
  ```

2. KVに「badWords」というキーでNGワードを登録する（ `;` で区切ると複数個登録できます）

## ライセンス

CC0