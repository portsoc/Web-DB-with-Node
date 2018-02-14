// functions for loading and showing the products in a given category

// this file requires the following various functions to be defined outside
/* global findEl, byId, array, apiFail, auth */

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

let loadCount = 0;

async function loadProducts(productsURL) {
  // if a request is already happening in the background, we need to cancel it
  // so keep track of how many loads we've done and only finish the request if we're the top request
  loadCount += 1;
  const loadNo = loadCount;

  cleanProducts();

  const response = await fetch(productsURL, auth());
  if (loadNo !== loadCount) return; // aborted request because another one has happened

  if (!response.ok) {
    console.error('error loading products from category ' + productsURL);
    apiFail();
    return;
  }

  const data = await response.json();
  if (loadNo !== loadCount) return; // aborted request because another one has happened

  populateProducts(data);
}

function populateProducts(data) {
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
