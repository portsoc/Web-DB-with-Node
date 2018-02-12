// functions for loading and showing the list of categories

// this file requires the variable `apiKey` and various functions to be defined outside
/* global findEl, byId, loadProducts, apiKey */

// get a list of categories from the server
function loadCategories() {
  const xhr = new XMLHttpRequest();
  xhr.onload = populateCategories;
  xhr.onerror = () => {
    console.error('error loading categories');
    apiFail();
  };
  xhr.open('get', '/api/categories/', true, apiKey);
  xhr.send();
}

// when the list of categories is received, put it in the page as tabs
function populateCategories() {
  if (this.status >= 300) {
    apiFail();
    return;
  }

  const data = JSON.parse(this.responseText);
  const categoriesEl = byId('categories');

  // empty the current list
  while (categoriesEl.firstChild) {
    categoriesEl.removeChild(categoriesEl.firstChild);
  }

  data.categories.forEach((category) => {
    const li = document.createElement('li');
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
  const oldActiveItem = findEl(listItem.parentElement, '.active');
  if (oldActiveItem) oldActiveItem.classList.remove('active');

  listItem.classList.add('active');

  // when a category is selected, we'll want to load the products in this category
  loadProducts(listItem.dataset.url);
}


function apiFail() {
  findEl(document, 'main').innerHTML = 'Sorry, the site is temporarily unhappy, please try again later.';
}

window.loadCategories = loadCategories;
