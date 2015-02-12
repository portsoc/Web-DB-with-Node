// functions for handling the shopping cart

// this file requires the variable `apiKey` to be defined outside

var cart = {};
var cartPrice = 0;
var cartCount = 0;

function addProductToCart(product) {
    if (product.id in cart) cart[product.id].qty++;
    else cart[product.id] = { product: product.id, qty: 1, price: product.price };

    cartPrice += product.price;
    cartCount++;

    var cartEl = byId('cart');

    findEl(cartEl, '.count').textContent = cartCount.toFixed();
    findEl(cartEl, '.price').textContent = cartPrice.toFixed(2);
    cartEl.classList.remove('empty');
}

function placeOrder() {
    var cartEl = byId('cart');
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

    return ok;
}

function submitOrder() {
    // prepare the object for submission
    var data = { order: {
      lines: [],
      address: byId('cart-addr').value,
      buyer: byId('cart-name').value
    }}

    // put in the order lines
    for (var key in cart) {
        data.order.lines.push( cart[key] );
    }

    // disable the button so the user doesn't click it twice
    byId('placeorder').disabled = true;

    // actually submit the data
    var xhr = new XMLHttpRequest();
    xhr.onload = orderSubmitted;
    xhr.onerror = function() {
        console.error("error submitting order");
        apiFail();
    }
    xhr.open("post", '/api/orders/', true, apiKey);
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify(data));
}

function orderSubmitted() {
    if (this.status !== 201) {
        console.log("order not submitted as expected");
        return apiFail();
    }

    clearCart();

    try {
        // parse order, get its ID
        var data = JSON.parse(this.responseText);
        var orderId = data.order.id;
        
        // redirect to the order tracking page
        window.location = "/order?id=" + encodeURIComponent(orderId);
    } catch (err) {
        console.log("order submitted but not returned as expected");
        return apiFail();
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
