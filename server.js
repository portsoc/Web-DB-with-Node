/*
 * this is a server and an API for an example database
 *
 * author: Jacek Kopecký, jacek@jacek.cz, http://github.com/jacekkopecky
 */

'use strict';

var express = require('express')
var fs = require('fs')
var bodyParser = require('body-parser');

var app = express()
app.set('strict routing', true)

app.use(express.static('static', { maxAge: 5*60*1000 /* fiveMinutes */, extensions: [ "html" ] }));

app.use(bodyParser.json({limit: 4096}))


var apiKey = 'orewgthwoetgoirwejgboerigqt';


var categories = {
      categories: [
        { title: "Cameras",
          productsURL: "/api/categories/cam/" },
        { title: "Laptops",
          productsURL: "/api/categories/laptop/" }
      ]
    };

var products = [];

products['cam'] = {
      category: 'Cameras',
      products: {
        nixon123x: {
          title: 'Nixon 123X',
          price: 123.45,
          description: 'A basic camera, 12.3MPix',
          stock: 14,
          vendor: 'Nixon Specialists Inc.'
        },
        gunonp40e: {
          title: 'Gunon P40E',
          price: 580.99,
          description: 'Body (no lenses), 40MPix',
          stock: 2,
          vendor: 'BigShop Inc.'
        }
      }
    };
products['laptop'] = {
      category: 'Laptops',
      products: {
        ace4040: {
          title: 'Ace 4040',
          price: 349.99,
          description: '15" hi-res hi-perf with Windows',
          stock: 1,
          vendor: 'BigShop Inc.'
        },
        leonvo386: {
          title: 'Leonvo 386',
          price: 299.99,
          description: '13.3" flexible with Doors',
          stock: 73,
          vendor: 'BigShop Inc.'
        }
      }
    };

var orders = [
  { lines: [
      { product: 'leonvo386',
        qty: 1,
        price: 320 },
      { product: 'gunonp40e',
        qty: 1,
        price: 599.99 }
    ],
    address: '42 The Matrix',
    buyer: 'Mr Anderson',
    date: "2015-02-06",
    dispatched: false
  },
  { lines: [
      { product: 'leonvo386',
        qty: 2,
        price: 310 }
    ],
    address: '1 Yellow Brick Road, Ozshire',
    buyer: 'Ms Munchkin',
    date: "2014-12-10",
    dispatched: true
  }
];




app.get('/api/', function(req, res) { res.redirect('/api'); });
app.get('/api/categories', function(req, res) { res.redirect(req.url + '/'); });
app.get('/api/categories/:id', function(req, res) { res.redirect(req.url + '/'); });

app.get('/api/categories/', function(req, res) {
    res.send(categories);
});

app.post('/api/categories/', notImplemented);

app.get('/api/categories/:id/', function(req, res) {
    if (req.params.id in products) res.send(products[req.params.id]);
    else res.status(404).send('no such category: ' + req.params.id + '\n');
});

app.post('/api/categories/:id/', function(req, res) {
    if (!(req.params.id in products)) res.status(404).send('no such category: ' + req.params.id + '\n');
    if (!req.body) res.status(400).send('POST needs a JSON object body with one or more products in it\n');

    for (var product in req.body) {
        if (product in products[req.params.id]) {
            res.status(400).send('cannot add a product that\'s already known: ' + product + '\n');
            return;
        }
    }

    for (product in req.body) {
        products[req.params.id][product] = req.body[product];
    }
    res.send("products added\n");
});

app.post('/api/orders/', function(req, res) {
    if (!req.body) res.status(400).send('POST needs a JSON object body with one or more products in it\n');
    var order = req.body;
    order.date = new Date();
    order.dispatched = false;
    var orderNo = orders.push(order) - 1;
    res.location('/api/orders/' + orderNo).status(201).send(order);
});

app.get('/api/orders/:id', function(req, res) {
    if (!(req.params.id in orders)) res.status(404).send('no such order: ' + req.params.id + '\n');
    res.send(orders[req.params.id]);
});

// rate limiting, validation, authorization

app.listen(8088);






function notImplemented(req, res) {
    res.status(501).send("this functionality is envisioned but not implemented yet\n");
}
