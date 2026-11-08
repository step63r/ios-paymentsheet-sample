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

// 金額はクライアントを信用せず、サーバー側で固定する
const AMOUNT = 1000;
const CURRENCY = 'jpy';

// Apple のドメイン関連付けファイルは拡張子なし・ドット始まりのフォルダ配下にあるため、
// Express の既定（dotfiles: 'ignore'）では配信されない
app.use(express.static('public', { dotfiles: 'allow' }));
app.use(express.json());

app.get('/config', (_req, res) => {
  res.json({ publishableKey: STRIPE_PUBLISHABLE_KEY, amount: AMOUNT, currency: CURRENCY });
});

app.post('/create-payment-intent', async (_req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: AMOUNT,
      currency: CURRENCY,
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
