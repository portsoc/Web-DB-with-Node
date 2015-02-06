// functions for loading and showing the products in a given category

// this file requires the variable `apiKey` to be defined outside

// empty the current list of products
function cleanProducts() {
    var productsEl = byId('products');
    var oldProducts = array(productsEl.querySelectorAll('section.product'));

    oldProducts.forEach(function(el) {
        productsEl.removeChild(el);
    });

    var productsHeader = byId('category_title');
    productsHeader.classList.add('loading');
    productsHeader.innerHTML = 'loading&hellip;';
}

var cancelOldProductLoad = function() {};

function loadProducts(productsURL) {
    cleanProducts();

    cancelOldProductLoad();
    var xhr = new XMLHttpRequest();
    xhr.onload = populateProducts;
    xhr.onerror = function() {
        console.error("error loading products from category " + productsURL);
        apiFail();
    }
    xhr.open("get", productsURL, true, apiKey);
    xhr.send();
    cancelOldProductLoad = function() {xhr.abort();}
}

function populateProducts() {
    if (this.status >= 300) return apiFail();

    var data = JSON.parse(this.responseText);

    var productsHeader = byId('category_title');
    productsHeader.classList.remove('loading');
    productsHeader.textContent = data.category;

    for (var prodId in data.products) {
        var product = data.products[prodId];
        product.id = prodId;
        var prodFragment = document.importNode(byId('product_template').content, true);
        var productEl = findEl(prodFragment, 'section');

        findEl(prodFragment, '.title').textContent = product.title;
        findEl(prodFragment, '.price').textContent = product.price.toFixed(2);
        findEl(prodFragment, '.desc' ).textContent = product.description;
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

