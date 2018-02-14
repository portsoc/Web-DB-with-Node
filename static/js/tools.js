// tool functions for accessing page elements

function byId(id) {
  return document.getElementById(id);
}

function findEl(root, selector) {
  return root.querySelector(selector);
}

function array(arr) {
  return [].slice.call(arr);
}

// function from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
function getParameterByName(name) {
  name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
  const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  const results = regex.exec(window.location.search);
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// this function requires the variable `apiKey` to be defined outside
/* global apiKey */

function auth() {
  return { headers: { authorization: 'Basic ' + btoa(apiKey + ':') } };
}


window.byId = byId;
window.findEl = findEl;
window.array = array;
window.getParameterByName = getParameterByName;
window.auth = auth;
