import { mountCheckout } from './checkout.js';

const $ = (id) => document.getElementById(id);
const CART_KEY = 'cart';
const MAX_QTY = 99;

const { publishableKey, currency } = await (await fetch('/config')).json();
const products = await (await fetch('/products')).json();
const productById = new Map(products.map((p) => [p.id, p]));

const yen = (n) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency }).format(n);

// Safari のプライベートブラウズ等では localStorage が例外を投げるため、失敗してもメモリ上で動かす
let cart = (() => {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) ?? {}; } catch { return {}; }
})();
const saveCart = () => {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* メモリ上のみで継続 */ }
};

const cartItems = () =>
  Object.entries(cart)
    .filter(([id]) => productById.has(id))
    .map(([id, qty]) => ({ product: productById.get(id), qty }));
const cartTotal = () => cartItems().reduce((sum, { product, qty }) => sum + product.price * qty, 0);
const cartCount = () => cartItems().reduce((sum, { qty }) => sum + qty, 0);

function changeQty(id, delta) {
  const next = Math.min(MAX_QTY, (cart[id] ?? 0) + delta);
  if (next <= 0) delete cart[id]; else cart[id] = next;
  saveCart();
  render();
}

function lineHtml({ product, qty }, editable) {
  const controls = editable
    ? `<div class="qty">
         <button data-act="dec" data-id="${product.id}" aria-label="減らす">−</button>
         <span>${qty}</span>
         <button data-act="inc" data-id="${product.id}" aria-label="増やす">＋</button>
       </div>`
    : `<span class="qty-fixed">× ${qty}</span>`;
  return `<div class="line">
    <span class="emoji">${product.emoji}</span>
    <span class="name">${product.name}<small>${yen(product.price)}</small></span>
    ${controls}
    <span class="subtotal">${yen(product.price * qty)}</span>
  </div>`;
}

function renderProducts() {
  $('product-list').innerHTML = products.map((p) => `
    <article class="glass product">
      <div class="emoji big">${p.emoji}</div>
      <h2>${p.name}</h2>
      <p class="price">${yen(p.price)}</p>
      <button class="btn primary" data-act="add" data-id="${p.id}">カートに入れる</button>
    </article>`).join('');
}

function renderCart() {
  const items = cartItems();
  $('cart-items').innerHTML = items.length
    ? `<div class="glass">${items.map((i) => lineHtml(i, true)).join('')}</div>`
    : '<p class="glass empty">カートは空です。</p>';
  $('cart-total').textContent = yen(cartTotal());
  $('to-checkout').hidden = items.length === 0;
}

function renderBadge() {
  const count = cartCount();
  $('cart-count').textContent = count;
  $('cart-count').hidden = count === 0;
}

let unmountCheckout;
let lastOrder;

function showCheckout() {
  const items = cartItems();
  $('checkout-items').innerHTML = items.map((i) => lineHtml(i, false)).join('');
  $('checkout-total').textContent = yen(cartTotal());
  $('message').textContent = '';
  $('unsupported').hidden = true;

  unmountCheckout = mountCheckout({
    publishableKey,
    currency,
    total: cartTotal(),
    items,
    onUnsupported: () => { $('unsupported').hidden = false; },
    onError: (text) => { $('message').textContent = text; },
    onSuccess: (paymentIntent) => {
      lastOrder = { id: paymentIntent.id, total: paymentIntent.amount };
      cart = {};
      saveCart();
      render();
      location.hash = '#/complete';
    },
  });
}

function render() {
  renderBadge();
  renderCart();
}

const VIEWS = ['products', 'cart', 'checkout', 'complete'];

function route() {
  unmountCheckout?.();
  unmountCheckout = undefined;

  let name = { '#/cart': 'cart', '#/checkout': 'checkout', '#/complete': 'complete' }[location.hash] ?? 'products';
  // 直接アクセスで空のカートや未決済のまま進めないようにする
  if (name === 'checkout' && cartCount() === 0) name = 'cart';
  if (name === 'complete' && !lastOrder) name = 'products';

  for (const v of VIEWS) $(`view-${v}`).hidden = v !== name;
  if (name === 'checkout') showCheckout();
  if (name === 'complete') {
    $('complete-detail').textContent = `お支払い金額 ${yen(lastOrder.total)}（決済ID: ${lastOrder.id}）`;
  }
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const { act, id } = btn.dataset;
  if (act === 'add' || act === 'inc') changeQty(id, 1);
  if (act === 'dec') changeQty(id, -1);
});

renderProducts();
render();
window.addEventListener('hashchange', route);
route();
