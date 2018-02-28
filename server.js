/*
 *  this is a server and an API for an example database
 *  this server is persisted in a MySQL database
 *
 *  author: Jacek Kopecký, jacek@jacek.cz, http://github.com/jacekkopecky
 */

'use strict';

/*
 *  general setup, loading libraries
 */
const bodyParser = require('body-parser');
const auth = require('basic-auth');
const mysql = require('mysql2/promise');
const assert = require('assert');
const express = require('express');

const config = require('./config.js');

const app = express();
const sqlPromise = mysql.createConnection(config.mysql);


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
 *  set up error reporting
 */
app.use(handleWebAppError);

/*
 *  start server
 */
app.listen(config.port);
console.log('server starting on port ' + config.port);


/* ************************************************
 *
 *  actual database and business logic functions
 *
 ************************************************ */

/*
 *  list categories
 *  returns something like this:
 *  {
 *    "categories": [
 *      {
 *        "title": "Cameras",
 *        "productsURL": "/api/categories/cam/"
 *      },
 *      {
 *        "title": "Phones",
 *        "productsURL": "/api/categories/phone/"
 *      },
 *      {
 *        "title": "Laptops",
 *        "productsURL": "/api/categories/laptop/"
 *      }
 *    ]
 *  }
 */
async function listCategories(req, res, next) {
  try {
    const sql = await sqlPromise;
    const query = 'SELECT id, name FROM Category ORDER BY priority, name';

    const [rows] = await sql.query(query);

    const categories = rows.map((row) => {
      return {
        title: row.name,
        productsURL: '/api/categories/' + row.id + '/',
      };
    });

    res.send({ categories });
  } catch (e) {
    next(e);
  }
}

/*
 *  add a category
 */
function addCategory(req, res) { notImplemented(req, res); }

/*
 *  list products from a category
 *  returns something like this:
 *  {
 *    "category": "Cameras",
 *    "products": {
 *      "1": {
 *        "title": "Nixon 123X",
 *        "price": 123.45,
 *        "description": "A basic camera, 12.3MPix",
 *        "stock": 14,
 *        "supplier": "Nixon Specialists Inc."
 *      },
 *      "2": {
 *        "title": "Gunon P40E",
 *        "price": 580.99,
 *        "description": "Body (no lenses), 40MPix",
 *        "stock": 2,
 *        "supplier": "BigShop Inc."
 *      },
 *      "3": {
 *        "title": "Gunon P30E",
 *        "price": 399.99,
 *        "description": "Body (no lenses), 30MPix, discontinued",
 *        "stock": 0,
 *        "supplier": "BigShop Inc."
 *      }
 *    }
 *  }
 */
async function listProducts(req, res, next) {
  try {
    const sql = await sqlPromise;
    const query = sql.format(
      `SELECT C.name, S.name, P.name, P.price, P.description, P.stock, P.id
       FROM Category C
       JOIN Product P on C.id = P.category
       JOIN Supplier S on S.id = P.supplier
       WHERE P.category = ?
       ORDER BY P.name`,
      req.params.id,
    );

    const [rows] = await sql.query({ sql: query, nestTables: true });
    // simpleSQLQuery({ sql: query, nestTables: true }, productsFromSQL, res, next);

    if (rows.length === 0) {
      throw new WebAppError(404, 'no such category: ' + req.params.id);
    }

    const products = {
      category: rows[0].C.name,
      products: {},
    };

    rows.forEach((row) => {
      products.products[row.P.id] = {
        title: row.P.name,
        price: Number(row.P.price),
        description: row.P.description,
        stock: Number(row.P.stock),
        supplier: row.S.name,
      };
    });

    res.send(products);
  } catch (e) {
    next(e);
  }
}

/*
 *  add a product to a category
 */
function addProductToCategory(req, res) { notImplemented(req, res); }

/*
 *  add an order
 *  accepts something like this:
 *  {
 *    "order": {
 *      "buyer": "john",
 *      "address": "portsmouth",
 *      "lines": [
 *        {
 *          "product": 2,
 *          "title": "Gunon P40E",
 *          "price": 580.99,
 *          "qty": 2
 *        },
 *        {
 *          "product": 1,
 *          "title": "Nixon 123X",
 *          "price": 123.45,
 *          "qty": 1
 *        }
 *      ]
 *    }
 *  }
 *  returns the same thing with extra "date", "dispatched" and "id" properties of the "order" object
 */
async function addOrder(req, res, next) {
  try {
    const validOrder = await validateOrder(req.body); // this will throw an exception if order is not valid
    const orderNo = await storeValidOrder(validOrder);

    // all the queries have gone through and are committed,
    // so now return the complete order

    validOrder.order.id = orderNo;
    const orderURL = '/api/orders/' + orderNo + '/';
    res.set('Content-Location', orderURL);
    res.location(orderURL).status(201).send(validOrder);

    console.log('accepted order ' + orderNo);

    // schedule to dispatch the order in a moment
    setTimeout(dispatchOrder, 10000, orderNo);
  } catch (e) {
    next(e);
  }
}
/*
 *  validation that all the required properties are there
 *  returns a validated version of the order without any unexpected data
 */
async function validateOrder(data) {
  const allowedProductIDTypes = { number: true, string: true };
  const priceCheck = {}; // this will be a hash-table of products and their prices, used for checking the prices
  try {
    assert('order' in data,                                 "order data missing top-level 'order'");
    assert(Array.isArray(data.order.lines),                 "order missing 'lines' array");
    assert(data.order.lines.length > 0,                     "order 'lines' array must not be empty");
    assert(typeof data.order.buyer === 'string',            "order missing 'buyer' string");
    assert(typeof data.order.address === 'string',          "order missing 'address' string");
    data.order.lines.forEach((line) => {
      assert(allowedProductIDTypes[typeof line.product],    "order line missing 'product' ID string");
      assert(typeof line.qty === 'number',                  "order line missing 'qty' number");
      assert(Math.floor(line.qty) > 0,                      'order line qty must be at least 1');
      assert(typeof line.price === 'number',                "order line missing 'price' number");
      priceCheck[line.product] = line.price;
    });
    const lenComparison = Object.getOwnPropertyNames(priceCheck).length === data.order.lines.length;
    assert(lenComparison,                                   'order cannot have multiple lines with the same product');
  } catch (e) {
    throw new WebAppError(400, 'invalid order: ' + e.message);
  }

  // now verify that the products exist and have the right prices
  await checkProductsAndPrices(priceCheck); // will throw an error if check fails

  return extractValidOrder(data);
}

/*
 *  asynchronous check that the products exist and the client has the same prices as the database
 */
async function checkProductsAndPrices(prices) {
  const sql = await sqlPromise;

  let query = 'SELECT count(*) AS c FROM Product WHERE false';
  let expectedCount = 0;
  for (const id of Object.keys(prices)) {
    query += ' OR (id=' + sql.escape(id) + ' AND price=' + prices[id].toFixed(2) + ')';
    expectedCount += 1;
  }

  // the above makes a query like this:
  //     SELECT count(*) AS c
  //     FROM Product
  //     WHERE false
  //        OR (id='4' AND price=349.99)
  //        OR (id='5' AND price=299.99)
  //
  // which will return every product mentioned in the order, but only if the price matches our data
  // therefore, if we get fewer products than expected, some product ID doesn't exist or its price is not right

  const [rows] = await sql.query(query);

  if (rows[0].c !== expectedCount) {
    throw new WebAppError(400, 'sorry, prices have changed');
  }
}

/*
 *  extract only the expected parts of the data structure
 *  this function effectively ignores data that's unexpected in the incoming order
 */
function extractValidOrder(data) {
  const validOrder = {
    order: {
      lines: [],
      buyer: data.order.buyer,
      address: data.order.address,
    },
  };
  data.order.lines.forEach((line) => {
    validOrder.order.lines.push({
      product: line.product,
      qty: line.qty,
      price: line.price,
    });
  });

  return validOrder;
}

/*
 *  the order is validated, let's store it in the database
 */
async function storeValidOrder(validOrder) {
  const sql = await sqlPromise;

  // fill in date and dispatch status
  validOrder.order.date = new Date();
  validOrder.order.dispatched = false;

  // prepare sql queries for the following:
  // insert customer or get their ID
  // insert order
  // insert all the lines

  const queryInsertCustomer = sql.format(
    'INSERT INTO Customer SET ? ON DUPLICATE KEY UPDATE id=last_insert_id(id);',
    { name: validOrder.order.buyer, address: validOrder.order.address },
  );

  // the above gives a query like
  // INSERT INTO Customer
  // SET `name` = 'john', `address` = 'portsmouth'
  // ON DUPLICATE KEY UPDATE id=last_insert_id(id);

  const queryInsertOrder = sql.format(
    'INSERT INTO `Order` SET customer = last_insert_id(), ?',
    { date: validOrder.order.date, dispatched: validOrder.order.dispatched ? 'y' : 'n' },
  );

  // the above gives a query like
  // INSERT INTO `Order`
  // SET customer = last_insert_id(), `date` = '2015-02-12 16:12:55.414', `dispatched` = 'n'

  let queryInsertLines = 'INSERT INTO OrderLine (`order`, product, quantity, price) VALUES ';
  validOrder.order.lines.forEach((line, idx) => {
    if (idx) queryInsertLines += ', ';
    queryInsertLines += '( last_insert_id(), ';
    queryInsertLines += sql.escape(line.product) + ', ';
    queryInsertLines += sql.escape(line.qty) + ', ';
    queryInsertLines += sql.escape(line.price) + ')';
  });

  // the above gives a query like
  // INSERT INTO OrderLine (`order`, product, quantity, price)
  // VALUES ( last_insert_id(), '1', 1, 123.45),
  //        ( last_insert_id(), '2', 2, 580.99)

  // below, we use transactions here to make sure that either the above queries run successfully,
  // or none of them run at all
  // the statements are nested because each should only run if the preceding one succeeded

  // create a new connection so another addOrder() doesn't mix into our transaction
  const txSql = await mysql.createConnection(config.mysql);
  try {
    await txSql.beginTransaction();
    await txSql.query(queryInsertCustomer);

    const [insertOrderResults] = await txSql.query(queryInsertOrder);
    await txSql.query(queryInsertLines);
    await txSql.commit();
    return insertOrderResults.insertId;
  } catch (e) {
    txSql.rollback();
    throw e;
  }
}

/*
 *  set the given order as dispatched
 *  this isn't directly used by the API; rather it's currently
 *  automatically "faked" a moment after the order is created (unless the server gets restarted)
 */
async function dispatchOrder(orderNo) {
  try {
    const sql = await sqlPromise;
    const query = sql.format("UPDATE `Order` set dispatched='y' where id=?", orderNo);

    await sql.query(query);
    console.log('dispatched order ' + orderNo);
  } catch (e) {
    console.error('error while dispatching order (ignoring): ', e);
  }
}

/*
 *  retrieve the status of an order
 *  returns a structure like this:
 *  {
 *    "order": {
 *      "buyer": "john",
 *      "address": "portsmouth",
 *      "date": "2015-02-12T16:12:55.000Z",
 *      "dispatched": "y",
 *      "id": "20",
 *      "lines": [
 *        {
 *          "product": 2,
 *          "title": "Gunon P40E",
 *          "price": 580.99,
 *          "qty": 2
 *        },
 *        {
 *          "product": 1,
 *          "title": "Nixon 123X",
 *          "price": 123.45,
 *          "qty": 1
 *        }
 *      ]
 *    }
 *  }
 */
async function getOrder(req, res, next) {
  try {
    const sql = await sqlPromise;
    const query = sql.format(
      `SELECT P.id, P.name, L.quantity, L.price, C.name, C.address, O.date, O.dispatched
       FROM Customer C
       JOIN \`Order\` O ON C.id = O.customer
       JOIN OrderLine L ON L.\`order\` = O.id
       JOIN Product P ON L.product = P.id
       WHERE O.id = ?
       ORDER BY P.name`,
      req.params.id,
    );

    const [rows] = await sql.query({ sql: query, nestTables: true });

    // simpleSQLQuery(, ordersFromSQL, res, next);

    if (rows.length === 0) {
      throw new WebAppError(404, 'no such order: ' + req.params.id);
    }

    res.send({
      order: {
        buyer: rows[0].C.name,
        address: rows[0].C.address,
        date: rows[0].O.date,
        dispatched: rows[0].O.dispatched === 'y',
        id: req.params.id,
        lines: rows.map((row) => {
          return {
            product: row.P.id,
            title: row.P.name,
            price: row.L.price,
            qty: row.L.quantity,
          };
        }),
      },
    });
  } catch (e) {
    next(e);
  }
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
 *  error handling helper functions and a class
 */
function WebAppError(status, message) {
  Error.call(this);
  this.name = 'WebAppError';
  this.status = status;
  this.message = message;
  if (typeof message === 'string') this.message += '\n';
}
WebAppError.prototype = Object.create(Error.prototype);

function handleWebAppError(err, req, res, next) {
  console.log('reporting error:', err);
  res.status(err.status || 500).send(err.message || 'unknown server error');
  next();
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
