// functions for loading and showing the products in a given category

// this file requires the variable `apiKey` and various functions to be defined outside
/* global findEl, byId, array, apiKey, apiFail */

// empty the current list of products
function cleanProducts() {
  const productsEl = byId('products');
  const oldProducts = array(productsEl.querySelectorAll('section.product'));

  oldProducts.forEach((el) => {
    productsEl.removeChild(el);
  });

  const productsHeader = byId('category_title');
  productsHeader.classList.add('loading');
  productsHeader.innerHTML = 'loading&hellip;';
}

let cancelOldProductLoad = () => {};

function loadProducts(productsURL) {
  cleanProducts();

  cancelOldProductLoad();
  const xhr = new XMLHttpRequest();
  xhr.onload = populateProducts;
  xhr.onerror = () => {
    console.error('error loading products from category ' + productsURL);
    apiFail();
  };
  xhr.open('get', productsURL, true, apiKey);
  xhr.send();
  cancelOldProductLoad = () => { xhr.abort(); };
}

function populateProducts() {
  if (this.status >= 300) {
    apiFail();
    return;
  }

  const data = JSON.parse(this.responseText);

  const productsHeader = byId('category_title');
  productsHeader.classList.remove('loading');
  productsHeader.textContent = data.category;

  for (const prodId of Object.keys(data.products)) {
    const product = data.products[prodId];
    product.id = prodId;
    const prodFragment = document.importNode(byId('product_template').content, true);
    const productEl = findEl(prodFragment, 'section');

    findEl(prodFragment, '.title').textContent = product.title;
    findEl(prodFragment, '.price').textContent = product.price.toFixed(2);
    findEl(prodFragment, '.desc').textContent = product.description;
    findEl(prodFragment, '.suppl').textContent = product.supplier;
    findEl(prodFragment, '.stock').textContent = product.stock;

    // save product data in the HTML element
    productEl.product = product;

    if (product.stock > 0) {
      productEl.classList.add('available');
    }

    byId('products').appendChild(prodFragment);
  }
}

window.loadProducts = loadProducts;
