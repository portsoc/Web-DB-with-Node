/*
 * this is a server and an API for an example database
 *
 * author: Jacek Kopecký, jacek@jacek.cz, http://github.com/jacekkopecky
 */

/* eslint-disable dot-notation */

'use strict';

const bodyParser = require('body-parser');
const auth = require('basic-auth');
const express = require('express');

const config = require('./config.js');

const app = express();

/* ************************************************
 *
 *  set up server options and resources
 *
 ************************************************ */

/*
 *  by default, express.js treats resource paths like "/foo" and "/foo/" as the same, we don't want that
 */
app.set('strict routing', true);

/*
 *  this will serve our static files
 */
app.use(express.static('static', config.expressStatic));

/*
 *  this will add support for JSON payloads in incoming data
 */
app.use(bodyParser.json(config.bodyParser_JSON));

/*
 *  redirect from /api/ to /api which is actually static/api.html - the API documentation
 */
app.get('/api/', (req, res) => { res.redirect('/api'); });

/*
 *  require api key for api calls
 *  we want to have an API key to be able to manage the use of our API
 *  it's here after setting /api/ so that we don't require the key for /api/
 */
app.use('/api/*', checkApiKey);

/*
 *  delay every API request by 1s (or whatever config.js says) to simulate relatively slow network
 */
if (config.apiCallDelay) {
  app.use('/api/*', (req, res, next) => {
    setTimeout(next, config.apiCallDelay);
  });
}

/*
 *  set up main application resources, grouped here by URI
 */
app.get('/api/categories/',      listCategories);
app.post('/api/categories/',     addCategory);

app.get('/api/categories/:id/',  listProducts);
app.post('/api/categories/:id/', addProductToCategory);

app.post('/api/orders/',         addOrder);

app.get('/api/orders/:id/',      getOrder);

/*
 *  setup redirects to URIs with slash at the end so that relative URIs work better
 */
app.get('/api/categories',       redirectToSlash);
app.get('/api/categories/:id',   redirectToSlash);
app.get('/api/orders/:id',       redirectToSlash);

function redirectToSlash(req, res) { res.redirect(req.url + '/'); }

/*
 *  start server
 */
app.listen(config.port);
console.log('server started on port ' + config.port);


/*
 *  in-memory variables that store the data
 */

const categories = {
  categories: [
    {
      title: 'Cameras',
      productsURL: '/api/categories/cam/',
    },
    {
      title: 'Laptops',
      productsURL: '/api/categories/laptop/',
    },
    {
      title: 'Phones',
      productsURL: '/api/categories/phone/',
    },
  ],
};

const products = [];
products['cam'] = {
  category: 'Cameras',
  products: {
    nixon123x: {
      title: 'Nixon 123X',
      price: 123.45,
      description: 'A basic camera, 12.3MPix',
      stock: 14,
      supplier: 'Nixon Specialists Inc.',
    },
    gunonp40e: {
      title: 'Gunon P40E',
      price: 580.99,
      description: 'Body (no lenses), 40MPix',
      stock: 2,
      supplier: 'BigShop Inc.',
    },
    gunonp30e: {
      title: 'Gunon P30E',
      price: 399.99,
      description: 'Body (no lenses), 30MPix, discontinued',
      stock: 0,
      supplier: 'BigShop Inc.',
    },
  },
};
products['laptop'] = {
  category: 'Laptops',
  products: {
    ace4040: {
      title: 'Ace 4040',
      price: 349.99,
      description: '15" hi-res hi-perf with Windows',
      stock: 1,
      supplier: 'BigShop Inc.',
    },
    leonvo386: {
      title: 'Leonvo Classic 386',
      price: 299.99,
      description: '13.3" flexible with Doors',
      stock: 73,
      supplier: 'BigShop Inc.',
    },
  },
};
products['phone'] = {
  category: 'Phones',
  products: {
    lexus1: {
      title: 'Lexus 1',
      price: 219.99,
      description: 'discontinued',
      stock: 0,
      supplier: 'Kaboodle Inc.',
    },
    lexus2: {
      title: 'Lexus 5',
      price: 299.99,
      description: 'better, almost discontinued',
      stock: 7,
      supplier: 'Kaboodle Inc.',
    },
    iph6: {
      title: 'flyPhone 7',
      price: 7399.90,
      description: 'not cheap but desirable',
      stock: 137,
      supplier: 'Oranges Pears etc. Ltd',
    },
    iph6p: {
      title: 'flyPhone 7+',
      price: 125999.90,
      description: 'honking big, newest and greatest',
      stock: 29,
      supplier: 'Oranges Pears etc. Ltd',
    },
    abc1: {
      title: 'example 1',
      price: 229.90,
      description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
      stock: 173,
      supplier: 'Random Corp.',
    },
    abc2: {
      title: 'example 2',
      price: 265.90,
      description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
      stock: 117,
      supplier: 'Random Corp.',
    },
    abc3: {
      title: 'example 3',
      price: 310.90,
      description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
      stock: 172,
      supplier: 'Random Corp.',
    },
    abc4: {
      title: 'example 4',
      price: 37.90,
      description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
      stock: 236,
      supplier: 'Random Corp.',
    },
    abc5: {
      title: 'example 5',
      price: 73.90,
      description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
      stock: 281,
      supplier: 'Random Corp.',
    },
    abc6: {
      title: 'example 6',
      price: 128.90,
      description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
      stock: 317,
      supplier: 'Random Corp.',
    },
    abc7: {
      title: 'example 7',
      price: 164.90,
      description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
      stock: 44,
      supplier: 'Random Corp.',
    },
  },
};

const orders = [
  {
    lines: [
      {
        product: 'leonvo386',
        qty: 1,
        price: 320,
      },
      {
        product: 'gunonp40e',
        qty: 1,
        price: 599.99,
      },
    ],
    address: '42 The Matrix',
    buyer: 'Mr Anderson',
    date: '2015-02-06',
    dispatched: false,
  },
  {
    lines: [
      {
        product: 'leonvo386',
        qty: 2,
        price: 310,
      },
    ],
    address: '1 Yellow Brick Road, Ozshire',
    buyer: 'Ms Munchkin',
    date: '2014-12-10',
    dispatched: true,
  },
];


function listCategories(req, res) {
  res.send(categories);
}

function addCategory(req, res) {
  notImplemented(req, res);
}

function listProducts(req, res) {
  if (req.params.id in products) {
    res.send(products[req.params.id]);
  } else {
    res.status(404).send('no such category: ' + req.params.id + '\n');
  }
}

function addProductToCategory(req, res) {
  if (!(req.params.id in products)) {
    res.status(404).send('no such category: ' + req.params.id + '\n');
    return;
  }
  if (!req.body) {
    res.status(400).send('POST needs a JSON object body with one or more products in it\n');
    return;
  }

  for (const product of Object.keys(req.body)) {
    if (product in products[req.params.id]) {
      res.status(400).send('cannot add a product that\'s already known: ' + product + '\n');
      return;
    }
  }

  for (const product of Object.keys(req.body)) {
    products[req.params.id][product] = req.body[product];
  }
  res.send('products added\n');
}

function addOrder(req, res) {
  if (!req.body || !req.body.order) {
    res.status(400).send('POST needs a JSON object body with one or more products in it\n');
    return;
  }

  const order = req.body.order;
  order.date = new Date();
  order.dispatched = false;
  const orderNo = orders.push(order) - 1;
  order.id = orderNo;

  const orderURL = '/api/orders/' + orderNo;
  res.set('Content-Location', orderURL);
  res.location(orderURL).status(201).send({ order });

  console.log('received order ' + orderNo);

  // dispatch the order in a minute
  setTimeout(dispatch, 60000);
  function dispatch() {
    order.dispatched = true;
    console.log('dispatched order ' + orderNo);
  }
}

function getOrder(req, res) {
  if (!(req.params.id in orders)) {
    res.status(404).send('no such order: ' + req.params.id + '\n');
    return;
  }

  res.send({ order: orders[req.params.id] });
}


/* ************************************************
 *
 *  helpful functions
 *
 ************************************************ */

function notImplemented(req, res) {
  res.status(501).send('this functionality is envisioned but not implemented yet\n');
}

/*
 *  API key checking
 */
function checkApiKey(req, res, next) {
  const creds = auth(req);
  if (!creds || creds.name !== config.apiKey) {
    if (config.apiCallDelay && creds) {
      // we have credentials, they aren't the right ones, client should wait
      setTimeout(sendWWWAuthenticate, config.apiCallDelay, res);
    } else {
      // no wait delay or no credentials
      // no credentials should not wait because it's the browser's try without authentication
      sendWWWAuthenticate(res);
    }
    return;
  }
  next();
}

function sendWWWAuthenticate(res) {
  res.set('WWW-Authenticate', 'Basic realm=API Key required');
  res.status(401).send('API Key required');
}
