// functions for handling the shopping cart

// this file requires the variable `apiKey` and various functions to be defined outside
/* global findEl, byId, apiKey, apiFail */

let cart = {};
let cartPrice = 0;
let cartCount = 0;

function addProductToCart(product) {
  if (product.id in cart) cart[product.id].qty += 1;
  else cart[product.id] = { product: product.id, qty: 1, price: product.price };

  cartPrice += product.price;
  cartCount += 1;

  const cartEl = byId('cart');

  findEl(cartEl, '.count').textContent = cartCount.toFixed();
  findEl(cartEl, '.price').textContent = cartPrice.toFixed(2);
  cartEl.classList.remove('empty');
}

function placeOrder() {
  const cartEl = byId('cart');
  if (cartEl.classList.contains('expanded')) {
    if (verifyWholeForm()) submitOrder();
  } else {
    cartEl.classList.add('expanded');
    byId('cart-name').focus();
  }
}

function verifyNonEmpty(input) {
  if (input.value === '') {
    input.classList.add('error');
  } else {
    input.classList.remove('error');
  }
}

function verifyWholeForm() {
  let ok = true;

  if (byId('cart-addr').value === '') {
    byId('cart-addr').focus();
    byId('cart-addr').classList.add('error');
    ok = false;
  }
  if (byId('cart-name').value === '') {
    byId('cart-name').focus();
    byId('cart-name').classList.add('error');
    ok = false;
  }

  return ok;
}

function submitOrder() {
  // prepare the object for submission
  const data = {
    order: {
      lines: [],
      address: byId('cart-addr').value,
      buyer: byId('cart-name').value,
    },
  };

  // put in the order lines
  for (const key of Object.keys(cart)) {
    data.order.lines.push(cart[key]);
  }

  // disable the button so the user doesn't click it twice
  byId('placeorder').disabled = true;

  // actually submit the data
  const xhr = new XMLHttpRequest();
  xhr.onload = orderSubmitted;
  xhr.onerror = () => {
    console.error('error submitting order');
    apiFail();
  };
  xhr.open('post', '/api/orders/', true, apiKey);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify(data));
}

function orderSubmitted() {
  if (this.status !== 201) {
    console.log('order not submitted as expected');
    apiFail();
    return;
  }

  clearCart();

  try {
    // parse order, get its ID
    const data = JSON.parse(this.responseText);
    const orderId = data.order.id;

    // redirect to the order tracking page
    window.location = '/order?id=' + encodeURIComponent(orderId);
  } catch (err) {
    console.log('order submitted but not returned as expected');
    apiFail();
  }
}

function clearCart() {
  cart = {};
  cartPrice = 0;
  cartCount = 0;

  byId('cart').classList.remove('expanded');
  byId('cart').classList.add('empty');
  byId('placeorder').disabled = false;
}

window.addProductToCart = addProductToCart;
window.placeOrder = placeOrder;
window.verifyNonEmpty = verifyNonEmpty;
