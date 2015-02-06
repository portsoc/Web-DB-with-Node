/*
 * this is a server and an API for an example database
 *
 * author: Jacek Kopecký, jacek@jacek.cz, http://github.com/jacekkopecky
 */

'use strict';

var express = require('express')
var fs = require('fs')
var bodyParser = require('body-parser');
var auth = require('basic-auth');

var app = express()
app.set('strict routing', true)

app.use(express.static('static', { maxAge: 5*60*1000 /* fiveMinutes */, extensions: [ "html" ] }));

app.use(bodyParser.json({limit: 4096}))


var apiKey = 'orewgthwoetgoirwejgboerigqt';

function checkApiKey (req, res, next) {
    var creds = auth(req);
    if (!creds || creds.name !== apiKey) {
        res.set('WWW-Authenticate', 'Basic realm=API Key required');
        return res.status(401).send('API Key required');
    }
    next();
}


var categories = {
      categories: [
        { title: "Cameras",
          productsURL: "/api/categories/cam/" },
        { title: "Laptops",
          productsURL: "/api/categories/laptop/" },
        { title: "Phones",
          productsURL: "/api/categories/phone/" }
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
          supplier: 'Nixon Specialists Inc.'
        },
        gunonp40e: {
          title: 'Gunon P40E',
          price: 580.99,
          description: 'Body (no lenses), 40MPix',
          stock: 2,
          supplier: 'BigShop Inc.'
        },
        gunonp30e: {
          title: 'Gunon P30E',
          price: 399.99,
          description: 'Body (no lenses), 30MPix, discontinued',
          stock: 0,
          supplier: 'BigShop Inc.'
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
          supplier: 'BigShop Inc.'
        },
        leonvo386: {
          title: 'Leonvo Classic 386',
          price: 299.99,
          description: '13.3" flexible with Doors',
          stock: 73,
          supplier: 'BigShop Inc.'
        }
      }
    };

products['phone'] = {
      category: 'Phones',
      products: {
        lexus1: {
          title: 'Lexus 1',
          price: 219.99,
          description: 'discontinued',
          stock: 0,
          supplier: 'Kaboodle Inc.'
        },
        lexus2: {
          title: 'Lexus 5',
          price: 299.99,
          description: 'better, almost discontinued',
          stock: 7,
          supplier: 'Kaboodle Inc.'
        },
        iph6: {
          title: 'flyPhone 6',
          price: 7399.90,
          description: 'not cheap but desirable',
          stock: 137,
          supplier: 'Oranges Pears etc. Ltd'
        },
        iph6p: {
          title: 'flyPhone 6+',
          price: 125999.90,
          description: 'honking big, newest and greatest',
          stock: 29,
          supplier: 'Oranges Pears etc. Ltd'
        },
        abc1: {
          title: 'example 1',
          price: 229.90,
          description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
          stock: 173,
          supplier: 'Random Corp.'
        },
        abc2: {
          title: 'example 2',
          price: 265.90,
          description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
          stock: 117,
          supplier: 'Random Corp.'
        },
        abc3: {
          title: 'example 3',
          price: 310.90,
          description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
          stock: 172,
          supplier: 'Random Corp.'
        },
        abc4: {
          title: 'example 4',
          price: 37.90,
          description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
          stock: 236,
          supplier: 'Random Corp.'
        },
        abc5: {
          title: 'example 5',
          price: 73.90,
          description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
          stock: 281,
          supplier: 'Random Corp.'
        },
        abc6: {
          title: 'example 6',
          price: 128.90,
          description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
          stock: 317,
          supplier: 'Random Corp.'
        },
        abc7: {
          title: 'example 7',
          price: 164.90,
          description: 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',
          stock: 44,
          supplier: 'Random Corp.'
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

// require api key for api calls
// it's here after setting /api/ so that we don't require the key for /api/
app.use('/api/*', checkApiKey);

app.use('/api/*', delay);


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

    var orderURL = '/api/orders/' + orderNo;
    res.set('Content-Location', orderURL);
    res.location(orderURL).status(201).send(order);

    console.log("received order " + orderNo);

    // dispatch the order in a minute
    setTimeout(dispatch, 60000);
    function dispatch() {
        order.dispatched = true;
        console.log("dispatched order " + orderNo);
    }
});

app.get('/api/orders/:id', function(req, res) {
    if (!(req.params.id in orders)) res.status(404).send('no such order: ' + req.params.id + '\n');
    res.send(orders[req.params.id]);
});

// rate limiting, validation, authorization

app.listen(8080);

console.log("server started on port 8080");




function notImplemented(req, res) {
    res.status(501).send("this functionality is envisioned but not implemented yet\n");
}

function delay(req, res, next) {
    // next();
    setTimeout(next, 1000);
}
