// functions for loading and showing an order

// this file requires the following various functions to be defined outside
/* global byId, getParameterByName, auth */

async function loadOrder() {
  const orderURI = '/api/orders/' + encodeURIComponent(getParameterByName('id')) + '/';
  if (orderURI === '') {
    byId('order').textContent = 'no order specified';
    return;
  }

  byId('orderid').textContent = orderURI;
  byId('order').innerHTML = 'loading&hellip;';

  const response = await fetch(orderURI, auth());
  if (!response.ok) {
    apiFail();
    return;
  }

  const data = await response.json();
  populateOrderData(data);
}

function populateOrderData(data) {
  byId('order').textContent = JSON.stringify(data, null, 2);
}

function apiFail() {
  byId('order').textContent = 'error loading order ' + getParameterByName('id');
}

window.loadOrder = loadOrder;
