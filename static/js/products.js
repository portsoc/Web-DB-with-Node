// functions for loading and showing the products in a given category

var cancelProductLoad;

function loadProducts(productsURL) {
    cleanProducts();

    if (cancelProductLoad) cancelProductLoad();
    var xhr = new XMLHttpRequest();
    xhr.onload = populateProducts;
    xhr.onerror = function() {
        console.error("error loading products from category " + productsURL);
        apiFail();
    }
    xhr.open("get", productsURL, true, apiKey);
    xhr.send();
    cancelProductLoad = function() {xhr.abort();}
}

function cleanProducts() {
    // empty the current list of products
    var productsEl = byId('products');
    [].slice.call(productsEl.querySelectorAll('section.product')).forEach(function(el) {
        productsEl.removeChild(el);
    });

    var productsHeader = byId('category_title');
    productsHeader.classList.add('loading');
    productsHeader.innerHTML = 'loading&hellip;';
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

        findEl(prodFragment, '.title').textContent = product.title;
        findEl(prodFragment, '.price').textContent = product.price;
        findEl(prodFragment, '.desc' ).textContent = product.description;
        findEl(prodFragment, '.suppl').textContent = product.supplier;
        findEl(prodFragment, '.stock').textContent = product.stock;

        if (product.stock > 0) {
            findEl(prodFragment, 'section').classList.add('available');
            var cartButton = findEl(prodFragment, '.addtocart');
            cartButton.product = product;
            cartButton.onclick = function() {
                addToCart(this.product);
            }
        }

        byId('products').appendChild(prodFragment);
    }
}

function apiFail() {
    findEl(document, 'main').innerHTML = "Sorry, the site is temporarily unhappy, please try again later.";
}

