import express from 'express';
import Stripe from 'stripe';

const { STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, PORT = 3000 } = process.env;

// 本番キーでの誤課金を避けるため、テストキー以外では起動させない
if (!STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_') || !STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  console.error('STRIPE_PUBLISHABLE_KEY / STRIPE_SECRET_KEY に pk_test_ / sk_test_ のキーを .env で設定してください。');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);
const app = express();

const CURRENCY = 'jpy';

// 価格の正はサーバー側。クライアントから送られた金額は使わず、商品IDと数量から再計算する
const PRODUCTS = [
  { id: 'coffee', name: 'ブレンドコーヒー豆 200g', price: 1200, emoji: '☕' },
  { id: 'mug', name: 'ホーローマグカップ', price: 1800, emoji: '🥣' },
  { id: 'tshirt', name: 'ロゴ Tシャツ', price: 3500, emoji: '👕' },
  { id: 'tote', name: 'キャンバストートバッグ', price: 2400, emoji: '👜' },
  { id: 'notebook', name: '方眼ノート 3冊セット', price: 900, emoji: '📓' },
  { id: 'sticker', name: 'ステッカーパック', price: 500, emoji: '🌟' },
];
const productById = new Map(PRODUCTS.map((p) => [p.id, p]));
const MAX_QTY = 99;

// Apple のドメイン関連付けファイルは拡張子なし・ドット始まりのフォルダ配下にあるため、
// Express の既定（dotfiles: 'ignore'）では配信されない
app.use(express.static('public', { dotfiles: 'allow' }));
app.use(express.json());

app.get('/config', (_req, res) => {
  res.json({ publishableKey: STRIPE_PUBLISHABLE_KEY, currency: CURRENCY });
});

app.get('/products', (_req, res) => {
  res.json(PRODUCTS);
});

app.post('/create-payment-intent', async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'カートが空です。' });
  }

  let amount = 0;
  const summary = [];
  for (const { id, qty } of items) {
    const product = productById.get(id);
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return res.status(400).json({ error: 'カートの内容が不正です。' });
    }
    amount += product.price * qty;
    summary.push(`${id} x${qty}`);
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: CURRENCY,
      automatic_payment_methods: { enabled: true },
      metadata: { items: summary.join(', ') },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
