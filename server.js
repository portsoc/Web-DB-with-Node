/*
 *  this is a server and an API for an example database
 *  this server is persisted in a MySQL database
 *
 *  author: Jacek Kopecký, jacek@jacek.cz, http://github.com/jacekkopecky
 */

/*jslint node:true*/
'use strict';

/*
 *  general setup, loading libraries
 */
var bodyParser = require('body-parser'),
    auth = require('basic-auth'),
    mysql = require('mysql'),
    assert = require('assert'),
    express = require('express'),
    config = require('./config.js'),
    app = express()

app.set('strict routing', true)


/*************************************************
 *
 *  set up server and resources
 *
 *************************************************/

/*
 *  this will serve our static files
 */
app.use(express.static('static', config.expressStatic))

/*
 *  this will add support for JSON payloads in incoming data
 */
app.use(bodyParser.json(config.bodyParser_JSON))

/*
 *  redirect from /api/ to /api which is API documentation
 */
app.get('/api/', function(req, res) { res.redirect('/api'); })

/*
 *  require api key for api calls
 *  we want to have an API key to be able to manage the use of our API
 *  it's here after setting /api/ so that we don't require the key for /api/
 */
app.use('/api/*', checkApiKey)

/*
 *  delay every API request by 1s to simulate relatively slow network
 */
if (config.apiCallDelay) {
    app.use('/api/*', function (req, res, next) {
        setTimeout(next, config.apiCallDelay)
    })
}

/*
 *  setup redirects to URIs with slash at the end so that relative URIs are guaranteed to work
 */
app.get('/api/categories', function(req, res) { res.redirect(req.url + '/'); })
app.get('/api/categories/:id', function(req, res) { res.redirect(req.url + '/'); })

/*
 *  set up main application resources, grouped here by URI
 */
app.get('/api/categories/', listCategories)
app.post('/api/categories/', addCategory)

app.get('/api/categories/:id/', listProducts)
app.post('/api/categories/:id/', addProductToCategory)

app.post('/api/orders/', addOrder)

app.get('/api/orders/:id', getOrder)

/*
 *  set up error reporting
 */
app.use(handleWebAppError)

/*
 *  start server
 */
app.listen(config.port)
console.log("server started on port " + config.port)



/*************************************************
 *
 *  actual database and business logic functions
 *
 *************************************************/

/*
 *  list categories
 */
function listCategories(req, res, next) {
    var query = 'SELECT id, name FROM Category ORDER BY priority, name';

    simpleSQLQuery(query, categoriesFromSQL, res, next);

    function categoriesFromSQL(results) {
        return {
            categories: results.map(function (row) {
                return {
                    title: row.name,
                    productsURL: '/api/categories/' + row.id + '/'
                }
            })
        }
    }
}

/*
 *  add a category
 */
function addCategory(req, res) { notImplemented(req, res); }

/*
 *  return products from a category
 */
function listProducts (req, res, next) {
    var query = sql.format(
        'SELECT C.name, S.name, P.name, P.price, P.description, P.stock, P.id \
         FROM Category C, Product P, Supplier S \
         WHERE C.id = ? and P.category = ? and S.id = P.supplier \
         ORDER BY P.name',
        [req.params.id, req.params.id]);

    simpleSQLQuery({sql: query, nestTables: true}, productsFromSQL, res, next);

    function productsFromSQL(results) {
        if (results.length === 0) return next(webappError(404, 'no such category: ' + req.params.id));

        var retval = {
            category: results[0].C.name,
            products: {}
        }

        results.forEach(function (row) {
            retval.products[row.P.id] = {
                title: row.P.name,
                price: row.P.price,
                description: row.P.description,
                stock: row.P.stock,
                supplier: row.S.name
            }
        })

        return retval;
    }
}

/*
 *  add a product to a category
 */
function addProductToCategory(req, res) { notImplemented(req, res); }

/*
 *  add an order
 */
function addOrder(req, res, next) {
    validateOrder(req.body);

    /*
     *  validation
     */
    function validateOrder(data) {
        var priceCheck = {};
        var allowedProductIDTypes = { number: true, string: true };
        try {
            assert('order' in data,                                 "order data missing top-level 'order'")
            assert(Array.isArray(data.order.lines),                 "order missing 'lines' array");
            assert(data.order.lines.length > 0,                     "order 'lines' array must not be empty");
            assert(typeof(data.order.buyer) === 'string',           "order missing 'buyer' string");
            assert(typeof(data.order.address) === 'string',         "order missing 'address' string");
            data.order.lines.forEach(function (line) {
                assert(allowedProductIDTypes[typeof(line.product)], "order line missing 'product' ID string");
                assert(typeof(line.qty) === 'number',               "order line missing 'qty' number");
                assert(Math.floor(line.qty) > 0,                    "order line qty must be at least 1");
                assert(typeof(line.price) === 'number',             "order line missing 'price' number");
                priceCheck[line.product] = line.price;
            });
            assert(Object.getOwnPropertyNames(priceCheck).length === data.order.lines.length,
                                                                    "order cannot have multiple lines with the same product");
        } catch (e) {
            return next(webappError(400, 'invalid order: ' + e.message));
        }

        // now verify that the products exist and have the right prices
        checkProductsAndPrices(priceCheck, data);
    }

    /*
     *  asynchronous check that the products exist and the client has the same prices as the database
     */
    function checkProductsAndPrices(prices, data) {
        var query = "SELECT count(*) as c from Product where false";
        var expectedCount = 0;
        for (var id in prices) {
            query += ' or (id=' + sql.escape(id) + ' and price=' + prices[id].toFixed(2) + ')';
            expectedCount++;
        }

        sql.query(query, function(err, results) {
            if (err) {
                return next(databaseError(err));
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
     */
    function extractValidOrder(data) {
        var validOrder = {
            order: {
                lines: [],
                buyer: data.order.buyer,
                address: data.order.address
            }
        }
        data.order.lines.forEach(function (line) {
            validOrder.order.lines.push({
                product: line.product,
                qty: line.qty,
                price: line.price
            });
        });

        return validOrder;
    }

    /*
     *  the order is validated, let's store it in the database
     */
    function storeValidOrder(validOrder) {
        validOrder.order.date = new Date();
        validOrder.order.dispatched = false;

        // prepare sql queries for the following:
        // insert customer or get their ID
        // insert order
        // insert all the lines

        var queryInsertCustomer = sql.format(
            'INSERT INTO Customer SET ? on duplicate key update id=last_insert_id(id);',
            { name: validOrder.order.buyer, address: validOrder.order.address });

        var queryInsertOrder = sql.format(
            'INSERT INTO `Order` SET customer = last_insert_id(), ?',
            { date: validOrder.order.date, dispatched: validOrder.order.dispatched ? 'y' : 'n' });

        var queryInsertLines = 'INSERT INTO OrderLine (`order`, product, quantity, price) VALUES ';
        validOrder.order.lines.forEach(function (line, idx) {
            if (idx) queryInsertLines += ', ';
            queryInsertLines += '( last_insert_id(), ';
            queryInsertLines += sql.escape(line.product) + ', ';
            queryInsertLines += sql.escape(line.qty) + ', ';
            queryInsertLines += sql.escape(line.price) + ')';
        });

        sql.beginTransaction(function (err) {
            if (err) return next(databaseError(err));
            sql.query(queryInsertCustomer, function (err) {
                if (err) return rollback(err, next);
                sql.query(queryInsertOrder, function (err, insertOrderResults) {
                    if (err) return rollback(err, next);
                    sql.query(queryInsertLines, function (err) {
                        if (err) return rollback(err, next);
                        sql.commit(function (err) {
                            if (err) return rollback(err, next);

                            // all the queries have gone through, in a transaction
                            var orderNo = insertOrderResults.insertId;
                            var orderURL = '/api/orders/' + orderNo;
                            res.set('Content-Location', orderURL);
                            res.location(orderURL).status(201).send(validOrder);

                            console.log("received order " + orderNo);

                            // dispatch the order in a minute
                            setTimeout(dispatchOrder, 60000, orderNo);
                        });
                    });
                });
            });
        });
    }
}

/*
 *  set the given order as dispatched
 *  this isn't directly used by the API; rather it's currently automatically "faked" a minute after the order is created (unless the server gets restarted)
 */
function dispatchOrder(orderNo) {
    var query = sql.format("UPDATE `Order` set dispatched='y' where id=?", orderNo);

    sql.query(query, function(err, results) {
        if (err) {
            console.log(err);
            return;
        }

        console.log('dispatched order ' + orderNo);
    });
}

/*
 *  retrieve the status of an order
 */
function getOrder(req, res, next) {
    var query = sql.format(
        'SELECT P.id, P.name, L.quantity, L.price, C.name, C.address, O.date, O.dispatched \
         FROM Customer C, Product P, `Order` O, OrderLine L \
         WHERE O.id = ? and L.`order` = ? and C.id = O.customer and L.product = P.id \
         ORDER BY P.name',
        [req.params.id, req.params.id]);

    simpleSQLQuery({sql: query, nestTables: true}, ordersFromSQL, res, next);

    function ordersFromSQL(results) {
        if (results.length === 0) return next(webappError(404, 'no such order: ' + req.params.id));

        return { order: {
            buyer: results[0].C.name,
            address: results[0].C.address,
            date: results[0].O.date,
            dispatched: results[0].O.dispatched,
            lines: results.map(function (row) {
                return {
                    product: row.P.id,
                    title: row.P.name,
                    price: row.L.price,
                    qty: row.L.quantity
                }
            })
        }}
    }
}




/*************************************************
 *
 *  helpful functions
 *
 *************************************************/

function notImplemented(req, res) {
    res.status(501).send("this functionality is envisioned but not implemented yet\n");
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
    sql.query(query, function(err, results) {
        if (err) {
            return next(databaseError(err));
        }

        try {
            var data = dataFunction(results);
            if (data) expressResponse.send(data);
        } catch (e) {
            if (e instanceof WebAppError) {
                return next(e);
            } else {
                throw e;
            }
        }
    });
}

/*
 *  error handling helper functions and a class
 */
function WebAppError(status, message) {
    Error.call(this);
    this.name = "WebAppError";
    this.status = status;
    this.message = message;
    if (typeof(message) === 'string') this.message += '\n';
}
WebAppError.prototype = Object.create(Error.prototype);

function handleWebAppError(err, req, res, next) {
    res.status(err.status).send(err.message);
    next();
}

function webappError(status, message) {
    return new WebAppError(status, message);
}

function databaseError(err) {
    console.log(err);
    if (err.fatal) reconnectMysqlConnection();
    return new WebAppError(500, 'database error');
}

function rollback(err, next) {
    // no need to wait for the rollback to execute, call next() right away
    sql.rollback();
    next(databaseError(err));
}


/*
 *  SQL connection handling
 */
var sql;
createMysqlConnection();

function createMysqlConnection() {
    sql = mysql.createConnection(config.mysql);
    sql.on('error', function() {
      reconnectMysqlConnection();
    })
}

function reconnectMysqlConnection() {
    console.log('sql error, trying to reconnect');
    setTimeout(createMysqlConnection, 1000);
}


/*
 *  API key checking
 */
function checkApiKey (req, res, next) {
    var creds = auth(req);
    if (!creds || creds.name !== config.apiKey) {
        res.set('WWW-Authenticate', 'Basic realm=API Key required');
        return res.status(401).send('API Key required');
    }
    next();
}
