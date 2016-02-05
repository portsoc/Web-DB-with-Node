// functions for loading and showing the list of categories

// this file requires the variable `apiKey` to be defined outside

// get a list of categories from the server
function loadCategories() {
    var xhr = new XMLHttpRequest();
    xhr.onload = populateCategories;
    xhr.onerror = function() {
        console.error("error loading categories");
        apiFail();
    }
    xhr.open("get", '/api/categories/', true, apiKey);
    xhr.send();
}

// when the list of categories is received, put it in the page as tabs
function populateCategories() {
    if (this.status >= 300) return apiFail();

    var data = JSON.parse(this.responseText);
    var categoriesEl = byId('categories');

    // empty the current list
    while (categoriesEl.firstChild)
      categoriesEl.removeChild(categoriesEl.firstChild);

    data.categories.forEach(function (category, idx) {
        var li = document.createElement('li');
        li.textContent = category.title;
        li.dataset.url = category.productsURL;
        li.onclick = selectCategoryClickHandler;
        categoriesEl.appendChild(li);
    });

    selectCategory(categoriesEl.firstChild);
}

// when a category is clicked, make it "selected"
function selectCategoryClickHandler(ev) {
    selectCategory(ev.target);
}

// make a given category "selected"
function selectCategory(listItem) {
    var oldActiveItem = findEl(listItem.parentElement, '.active');
    if (oldActiveItem) oldActiveItem.classList.remove('active');

    listItem.classList.add('active');

    // when a category is selected, we'll want to load the products in this category
    loadProducts(listItem.dataset.url);
}


function apiFail() {
    findEl(document, 'main').innerHTML = "Sorry, the site is temporarily unhappy, please try again later.";
}
