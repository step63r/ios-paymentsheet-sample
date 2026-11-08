let stripe;

// 金額確定前に PaymentIntent を作ると未使用の Intent が溜まるため、
// 支払い確定時に作る方式（deferred intent）にしている
export function mountCheckout({ publishableKey, currency, total, items, onSuccess, onError, onUnsupported }) {
  stripe ??= Stripe(publishableKey);
  const elements = stripe.elements({ mode: 'payment', amount: total, currency });

  const expressCheckout = elements.create('expressCheckout', {
    paymentMethods: { applePay: 'always', googlePay: 'never', link: 'never', amazonPay: 'never', paypal: 'never' },
  });
  expressCheckout.mount('#express-checkout');

  expressCheckout.on('ready', ({ availablePaymentMethods }) => {
    // 未対応環境ではボタンが空白になるだけで原因が分からないため、明示的に表示する
    if (!availablePaymentMethods?.applePay) onUnsupported();
  });

  expressCheckout.on('confirm', async () => {
    const { error: submitError } = await elements.submit();
    if (submitError) return onError(submitError.message);

    const res = await fetch('/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(({ product, qty }) => ({ id: product.id, qty })) }),
    });
    const { clientSecret, error } = await res.json();
    if (error) return onError(error);

    const result = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (result.error) return onError(result.error.message);
    onSuccess(result.paymentIntent);
  });

  return () => expressCheckout.destroy();
}
