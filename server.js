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
const mysql = require('mysql');
const assert = require('assert');
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
function listCategories(req, res, next) {
  const query = 'SELECT id, name FROM Category ORDER BY priority, name';

  simpleSQLQuery(query, categoriesFromSQL, res, next);

  function categoriesFromSQL(results) {
    const categories = results.map((row) => {
      return {
        title: row.name,
        productsURL: '/api/categories/' + row.id + '/',
      };
    });
    return { categories };
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
function listProducts(req, res, next) {
  const query = sql.format(
    `SELECT C.name, S.name, P.name, P.price, P.description, P.stock, P.id
     FROM Category C
     JOIN Product P on C.id = P.category
     JOIN Supplier S on S.id = P.supplier
     WHERE P.category = ?
     ORDER BY P.name`,
    req.params.id,
  );

  simpleSQLQuery({ sql: query, nestTables: true }, productsFromSQL, res, next);

  function productsFromSQL(results) {
    if (results.length === 0) {
      next(webappError(404, 'no such category: ' + req.params.id));
      return null;
    }

    const products = {
      category: results[0].C.name,
      products: {},
    };

    results.forEach((row) => {
      products.products[row.P.id] = {
        title: row.P.name,
        price: row.P.price,
        description: row.P.description,
        stock: row.P.stock,
        supplier: row.S.name,
      };
    });

    return products;
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
function addOrder(req, res, next) {
  validateOrder(req.body);

  /*
   *  validation that all the required properties are there
   */
  function validateOrder(data) {
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
      next(webappError(400, 'invalid order: ' + e.message));
      return;
    }

    // now verify that the products exist and have the right prices
    checkProductsAndPrices(priceCheck, data);
  }

  /*
   *  asynchronous check that the products exist and the client has the same prices as the database
   */
  function checkProductsAndPrices(prices, data) {
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

    sql.query(query, (err, results) => {
      if (err) {
        next(databaseError(err));
        return;
      }

      if (results[0].c !== expectedCount) {
        next(webappError(400, 'sorry, prices have changed'));
      } else {
        storeValidOrder(extractValidOrder(data));
      }
    });
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
  function storeValidOrder(validOrder) {
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

    sql.beginTransaction((err) => {
      if (err) {
        next(databaseError(err));
        return;
      }

      sql.query(queryInsertCustomer, (err) => {
        if (err) {
          rollback(err, next);
          return;
        }

        sql.query(queryInsertOrder, (err, insertOrderResults) => {
          if (err) {
            rollback(err, next);
            return;
          }

          sql.query(queryInsertLines, (err) => {
            if (err) {
              rollback(err, next);
              return;
            }

            sql.commit((err) => {
              if (err) {
                rollback(err, next);
                return;
              }

              // all the queries have gone through and are committed,
              // so now return the complete order

              const orderNo = insertOrderResults.insertId;
              validOrder.order.id = orderNo;
              const orderURL = '/api/orders/' + orderNo + '/';
              res.set('Content-Location', orderURL);
              res.location(orderURL).status(201).send(validOrder);

              console.log('received order ' + orderNo);

              // schedule to dispatch the order in a moment
              setTimeout(dispatchOrder, 10000, orderNo);
            });
          });
        });
      });
    });
  }
}

/*
 *  set the given order as dispatched
 *  this isn't directly used by the API; rather it's currently
 *  automatically "faked" a moment after the order is created (unless the server gets restarted)
 */
function dispatchOrder(orderNo) {
  const query = sql.format("UPDATE `Order` set dispatched='y' where id=?", orderNo);

  sql.query(query, (err) => {
    if (err) {
      console.log(err);
      return;
    }

    console.log('dispatched order ' + orderNo);
  });
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
function getOrder(req, res, next) {
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

  simpleSQLQuery({ sql: query, nestTables: true }, ordersFromSQL, res, next);

  function ordersFromSQL(results) {
    if (results.length === 0) {
      next(webappError(404, 'no such order: ' + req.params.id));
      return null;
    }

    return {
      order: {
        buyer: results[0].C.name,
        address: results[0].C.address,
        date: results[0].O.date,
        dispatched: results[0].O.dispatched === 'y',
        id: req.params.id,
        lines: results.map((row) => {
          return {
            product: row.P.id,
            title: row.P.name,
            price: row.L.price,
            qty: row.L.quantity,
          };
        }),
      },
    };
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
 *  runs a SQL query, gives its results to dataFunction, and sends the result back to the client
 *  parameters:
 *    query - the SQL query; or an object with more options, see mysql.query()
 *    dataFunction - a function that translates the SQL query results to a Javascript object to be sent to the client
 *    expressResponse - the `res` object on which we should respond to the client
 *    next - in case of an error, this function reports it to express
 *
 *  simpleSQLQuery handles errors both from the database or thrown by the dataFunction
 */

function simpleSQLQuery(query, dataFunction, expressResponse, next) {
  sql.query(query, (err, results) => {
    if (err) {
      next(databaseError(err));
      return;
    }

    try {
      const data = dataFunction(results);
      if (data) expressResponse.send(data);
    } catch (e) {
      if (e instanceof WebAppError) {
        next(e);
      } else {
        throw e;
      }
    }
  });
}

/*
 *  error handling helper functions and a class
 */
function webappError(status, message) {
  return new WebAppError(status, message);
}

function databaseError(err) {
  console.log(err);
  if (err.fatal) reconnectMysqlConnection();
  return new WebAppError(500, 'database error');
}

function WebAppError(status, message) {
  Error.call(this);
  this.name = 'WebAppError';
  this.status = status;
  this.message = message;
  if (typeof message === 'string') this.message += '\n';
}
WebAppError.prototype = Object.create(Error.prototype);

function rollback(err, next) {
  // no need to wait for the rollback to execute, call next() right away
  sql.rollback();
  next(databaseError(err));
}

function handleWebAppError(err, req, res, next) {
  res.status(err.status || 500).send(err.message || 'unknown server error');
  next();
}


/*
 *  SQL connection handling
 */
let sql;
createMysqlConnection();

function createMysqlConnection() {
  sql = mysql.createConnection(config.mysql);
  sql.on('error', () => {
    reconnectMysqlConnection();
  });
}

function reconnectMysqlConnection() {
  console.log('sql error, trying to reconnect');
  setTimeout(createMysqlConnection, 1000);
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
