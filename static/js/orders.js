// functions for loading and showing an order

/* global byId, apiKey, getParameterByName */

function loadOrder() {
  const orderURI = '/api/orders/' + encodeURIComponent(getParameterByName('id')) + '/';
  if (orderURI === '') {
    byId('order').textContent = 'no order specified';
    return;
  }

  byId('orderid').textContent = orderURI;
  byId('order').innerHTML = 'loading&hellip;';

  const xhr = new XMLHttpRequest();
  xhr.onload = populateOrderData;
  xhr.onerror = apiFail;
  xhr.open('get', orderURI, true, apiKey);
  xhr.send();
}

function populateOrderData() {
  if (this.status >= 300) {
    apiFail();
    return;
  }

  const data = JSON.parse(this.responseText);
  byId('order').textContent = JSON.stringify(data, null, 2);
}

function apiFail() {
  byId('order').textContent = 'error loading order ' + getParameterByName('id');
}

window.loadOrder = loadOrder;
