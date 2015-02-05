// functions for handling the shopping cart

// this file requires the variable `apiKey` to be defined outside

var cart = {};
var cartPrice = 0;
var cartCount = 0;

function addToCart(product) {
    if (product.id in cart) cart[product.id].qty++;
    else cart[product.id] = { product: product.id, qty: 1, price: product.price };

    cartPrice += product.price;
    cartCount++;

    var cartEl = byId('cart');

    findEl(cartEl, '.count').textContent = cartCount.toFixed();
    findEl(cartEl, '.price').textContent = cartPrice.toFixed(2);
    cartEl.classList.remove('empty');

    byId('placeorder').onclick = placeOrder;
}

function placeOrder() {
    byId('cart').classList.add('expanded');
    byId('cart-name').focus();
    byId('cart-name').onblur = verifyNonEmpty;
    byId('cart-addr').onblur = verifyNonEmpty;
    byId('placeorder').onclick = placeOrderVerify;
}

function verifyNonEmpty() {
    if (this.value === '') {
        this.classList.add('error');
    } else {
        this.classList.remove('error');
    }
}

function placeOrderVerify() {
    byId('cart').classList.add('expanded');

    var ok = true;

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

    if (ok) submitOrder();
}

function submitOrder() {
    var order = {
      lines: [],
      address: byId('cart-addr').value,
      buyer: byId('cart-name').value
    }

    for (var key in cart) {
        order.lines.push( cart[key] );
    }

    byId('placeorder').disabled = true;
    byId('cart').classList.remove('expanded');

    var xhr = new XMLHttpRequest();
    xhr.onload = orderSubmitted;
    xhr.onerror = function() {
        console.error("error submitting order");
        apiFail();
    }
    xhr.open("post", '/api/orders/', true, apiKey);
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify(order));
}

function orderSubmitted() {
    if (this.status !== 201) {
        console.log("order not submitted as expected");
        return apiFail();
    }

    clearCart();

    window.location = "/order?id=" + encodeURIComponent(this.getResponseHeader('location'));
}

function clearCart() {
    byId('placeorder').disabled = false;
    byId('cart').classList.add('empty');
    cart = {};
    cartPrice = 0;
    cartCount = 0;
}

