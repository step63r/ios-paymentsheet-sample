# ios-paymentsheet-sample

iPhone の Safari で Apple Pay のシートを出すための Stripe テスト用サンプル（Express Checkout Element）。
Stripe は必ずテストモードのキーで使うこと。`pk_test_` / `sk_test_` 以外では起動しない。

## 手順（PowerShell 7）

1. キーを設定する

   ```powershell
   Copy-Item .env.example .env
   # .env を編集して pk_test_... / sk_test_... を貼る
   ```

2. サーバーを起動する

   ```powershell
   npm install
   npm start
   ```

3. 別のターミナルで ngrok を起動する（ngrok v3 以降が必要。v2 は動作しない）

   ```powershell
   ngrok config add-authtoken <ngrokダッシュボードのAuthtoken>
   ngrok http 3000
   # 固定ドメインがある場合: ngrok http --url=<your-domain>.ngrok-free.app 3000
   ```

4. Stripe ダッシュボード（テストモード）> 設定 > 決済 > 支払い方法のドメイン で、ngrok のホスト名（`https://` なし）を登録する。
   - Apple 側の検証に失敗した場合のみ、表示される関連付けファイルをダウンロードし、
     拡張子なしのまま `public/.well-known/apple-developer-merchantid-domain-association` に置いてから再度 Verify する。

5. iPhone で準備する
   - Wallet にカードを追加する（テストキーなら課金されない）
   - 設定 > アプリ > Safari > 詳細 > 「Apple Payとカードの確認をWebサイトに許可」をオン
   - プライベートブラウズは使わない

6. iPhone の Safari で ngrok の HTTPS URL を開き、Apple Pay ボタンを押す。

## 構成

- `server.js`: 商品定義（価格の正）、`/config`、`/products`、`/create-payment-intent`（カートから金額を再計算）、静的配信
- `public/`: 画面
  - `index.html` / `style.css`: 商品一覧・カート・お支払い・完了の4画面（ハッシュ遷移）
  - `app.js`: カート（localStorage）と画面遷移
  - `checkout.js`: Express Checkout Element と決済確定

## 画面の流れ

商品一覧（`#/`）→ カート（`#/cart`）→ お支払い（`#/checkout`、Apple Pay ボタン）→ 完了（`#/complete`）
