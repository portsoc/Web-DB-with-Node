// functions for loading and showing the list of categories

function loadCategories() {
    cleanProducts();

    var xhr = new XMLHttpRequest();
    xhr.onload = populateCategories;
    xhr.onerror = function() {
        console.error("error loading categories");
        apiFail();
    }
    xhr.open("get", '/api/categories/', true, apiKey);
    xhr.send();
}

function populateCategories() {
    if (this.status >= 300) return apiFail();

    var data = JSON.parse(this.responseText);
    var categoriesEl = byId('categories');

    // empty the current list
    while (categoriesEl.firstChild) categoriesEl.removeChild(categoriesEl.firstChild);

    data.categories.forEach(function (category, idx) {
        var li = document.createElement('li');
        li.textContent = category.title;
        li.dataset.url = category.productsURL;
        li.onclick = selectCategory;
        categoriesEl.appendChild(li);
    });

    selectCategory({target: categoriesEl.firstChild});
}

function selectCategory(ev) {
    var li = ev.target;

    var oldLi = findEl(li.parentElement, '.active');
    if (oldLi) oldLi.classList.remove('active');

    li.classList.add('active');

    cleanProducts();

    loadProducts(li.dataset.url);
}

