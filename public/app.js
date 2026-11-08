const messageEl = document.getElementById('message');
const showMessage = (text) => { messageEl.textContent = text; };

const { publishableKey, amount, currency } = await (await fetch('/config')).json();
document.getElementById('amount').textContent =
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency }).format(amount);

const stripe = Stripe(publishableKey);
// PaymentIntent は支払い確定時に作る（deferred intent）。ボタン表示のたびに作ると未使用の Intent が溜まる
const elements = stripe.elements({ mode: 'payment', amount, currency });

const expressCheckout = elements.create('expressCheckout', {
  paymentMethods: { applePay: 'always', googlePay: 'never', link: 'never', amazonPay: 'never', paypal: 'never' },
});
expressCheckout.mount('#express-checkout');

expressCheckout.on('ready', ({ availablePaymentMethods }) => {
  // 未対応環境ではボタンが空白になるだけで原因が分からないため、明示的に表示する
  if (!availablePaymentMethods?.applePay) {
    document.getElementById('unsupported').hidden = false;
  }
});

expressCheckout.on('confirm', async () => {
  const { error: submitError } = await elements.submit();
  if (submitError) return showMessage(submitError.message);

  const res = await fetch('/create-payment-intent', { method: 'POST' });
  const { clientSecret, error } = await res.json();
  if (error) return showMessage(error);

  const result = await stripe.confirmPayment({
    elements,
    clientSecret,
    confirmParams: { return_url: window.location.href },
    redirect: 'if_required',
  });
  if (result.error) return showMessage(result.error.message);
  showMessage(`決済成功: ${result.paymentIntent.id} (${result.paymentIntent.status})`);
});
