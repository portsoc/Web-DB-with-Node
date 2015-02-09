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
var bodyParser = require('body-parser')
var auth = require('basic-auth')
var mysql = require('mysql')
var assert = require('assert')
var express = require('express')
var app = express()
app.set('strict routing', true)


/*************************************************
 *
 *  set up server and resources
 */

/*
 *  this will serve our static files
 */
app.use(express.static('static', { maxAge: 5*60*1000 /* fiveMinutes */, extensions: [ "html" ] }))

/*
 *  this will add support for JSON payloads in incoming data
 */
app.use(bodyParser.json({limit: 4096}))

/*
 *  redirect from /api/ to /api which is API documentation
 */
app.get('/api/', function(req, res) { res.redirect('/api'); })

/*
 *  require api key for api calls
 *  we want to have an API key to be able to manage the use of our API
 *  it's here after setting /api/ so that we don't require the key for /api/
 */
var apiKey = 'orewgthwoetgoirwejgboerigqt'
app.use('/api/*', checkApiKey)

/*
 *  delay every API request by 1s to simulate relatively slow network
 */
app.use('/api/*', function (req, res, next) {
    setTimeout(next, 1000)
})

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
app.listen(8080)
console.log("server started on port 8080")



/*************************************************
 *
 *  actual database and business logic functions
 */

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
    var query = mysql.format(
        'SELECT C.name, S.name, P.name, P.price, P.description, P.stock, P.id \
         FROM Category C, Product P, Supplier S \
         WHERE C.id = ? and P.category = ? and S.id = P.supplier \
         ORDER BY P.name',
        [req.params.id, req.params.id]);

    simpleSQLQuery({sql: query, nestTables: true}, productsFromSQL, res, next);

    function productsFromSQL(results) {
        if (results.length == 0) return next(webappError(404, 'no such category: ' + req.params.id));

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
            query += ' or (id=' + mysql.escape(id) + ' and price=' + prices[id].toFixed(2) + ')';
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

        var queryInsertCustomer = mysql.format(
            'INSERT INTO Customer SET ? on duplicate key update id=last_insert_id(id);',
            { name: validOrder.order.buyer, address: validOrder.order.address });

        var queryInsertOrder = mysql.format(
            'INSERT INTO `Order` SET customer = last_insert_id(), ?',
            { date: validOrder.order.date, dispatched: validOrder.order.dispatched ? 'y' : 'n' });

        var queryInsertLines = 'INSERT INTO OrderLine (`order`, product, quantity, price) VALUES ';
        validOrder.order.lines.forEach(function (line, idx) {
            if (idx) queryInsertLines += ', ';
            queryInsertLines += '( last_insert_id(), ';
            queryInsertLines += mysql.escape(line.product) + ', ';
            queryInsertLines += mysql.escape(line.qty) + ', ';
            queryInsertLines += mysql.escape(line.price) + ')';
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
    var query = mysql.format("UPDATE `Order` set dispatched='y' where id=?", orderNo);

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
    var query = mysql.format(
        'SELECT P.id, P.name, L.quantity, L.price, C.name, C.address, O.date, O.dispatched \
         FROM Customer C, Product P, `Order` O, OrderLine L \
         WHERE O.id = ? and L.`order` = ? and C.id = O.customer and L.product = P.id \
         ORDER BY P.name',
        [req.params.id, req.params.id]);

    simpleSQLQuery({sql: query, nestTables: true}, ordersFromSQL, res, next);

    function ordersFromSQL(results) {
        if (results.length == 0) {
            return next(webappError(404, 'no such order: ' + req.params.id));
        }

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
 */

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
    sql = mysql.createConnection({host:'localhost', user:'dbprin', password:'weiothbgdls', database: 'dbprin'});
}


/*
 *  API key checking
 */
function checkApiKey (req, res, next) {
    var creds = auth(req);
    if (!creds || creds.name !== apiKey) {
        res.set('WWW-Authenticate', 'Basic realm=API Key required');
        return res.status(401).send('API Key required');
    }
    next();
}




/*************************************************
    database setup in MySQL:

    CREATE USER dbprin@localhost identified by 'weiothbgdls';
    CREATE DATABASE dbprin;
    GRANT SELECT, INSERT, UPDATE ON dbprin.* to dbprin@localhost;
    USE dbprin;

    DROP TABLE IF EXISTS OrderLine;
    DROP TABLE IF EXISTS `Order`;
    DROP TABLE IF EXISTS Customer;
    DROP TABLE IF EXISTS Product;
    DROP TABLE IF EXISTS Supplier;
    DROP TABLE IF EXISTS Category;

    CREATE TABLE IF NOT EXISTS Category (
        id       varchar(8)  primary key,
        name     varchar(20) not null,
        priority double      not null unique,
        key(priority, name) -- so that we can order by the index
    ) engine=InnoDB;

    CREATE TABLE IF NOT EXISTS Supplier (
        id   int         primary key auto_increment,
        name varchar(30) not null
        -- probably also some contact details but that's not necessary in the demo
    ) engine=InnoDB;

    CREATE TABLE IF NOT EXISTS Product (
        id          int                 primary key auto_increment,
        name        varchar(30)         not null,
        price       decimal(8,2)        not null,
        description text,
        stock       mediumint unsigned  not null default 0,
        category    varchar(8)          not null,
        constraint foreign key (category) references Category(id),
        supplier    int,
        constraint foreign key (supplier) references Supplier(id)
    ) engine=InnoDB;

    CREATE TABLE IF NOT EXISTS Customer (
        id      int          primary key auto_increment,
        name    varchar(40)  not null,
        address varchar(200) not null,
        unique key (name, address)
    ) engine=InnoDB;

    CREATE TABLE IF NOT EXISTS `Order` (
        id         int           primary key auto_increment,
        customer   int           not null,
        constraint foreign key (customer) references Customer(id),
        date       datetime      not null default now(),
        dispatched enum('y','n') not null default 'n'
    ) engine=InnoDB;

    CREATE TABLE IF NOT EXISTS OrderLine (
        primary key (`order`, product),
        `order`  int,
        constraint foreign key (`order`) references `Order`(id),
        product  int,
        constraint foreign key (product) references Product(id),
        quantity mediumint unsigned not null,
        price    decimal(8,2)       not null
    ) engine=InnoDB;




    -- sample data

    INSERT INTO Category (id, name, priority) VALUES
        ('cam', 'Cameras', 1), ('phone', 'Phones', 2), ('laptop', 'Laptops', 3);

    INSERT INTO Supplier(id, name) VALUES
        (1, 'Nixon Specialists Inc.'),
        (2, 'BigShop Inc.'),
        (3, 'Kaboodle Inc.'),
        (4, 'Oranges Pears etc. Ltd'),
        (5, 'Random Corp.');

    INSERT INTO Product(id, name, price, description, stock, category, supplier) VALUES
        (1, 'Nixon 123X',         123.45, 'A basic camera, 12.3MPix',                                    14, 'cam',    1),
        (2, 'Gunon P40E',         580.99, 'Body (no lenses), 40MPix',                                     2, 'cam',    2),
        (3, 'Gunon P30E',         399.99, 'Body (no lenses), 30MPix, discontinued',                       0, 'cam',    2),
        (4, 'Ace 4040',           349.99, '15" hi-res hi-perf with Windows',                              1, 'laptop', 2),
        (5, 'Leonvo Classic 386', 299.99, '13.3" flexible with Doors',                                   73, 'laptop', 2),
        (6, 'Lexus 1',            219.99, 'discontinued',                                                 0, 'phone',  3),
        (7, 'Lexus 5',            299.99, 'better, almost discontinued',                                  7, 'phone',  3),
        (8, 'flyPhone 6',        7399.90, 'not cheap but desirable',                                    137, 'phone',  4),
        (9, 'flyPhone 6+',     125999.90, 'honking big, newest and greatest',                            29, 'phone',  4),
        (10, 'example 1',         229.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks', 173, 'phone',  5),
        (11, 'example 2',         265.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks', 117, 'phone',  5),
        (12, 'example 3',         310.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks', 172, 'phone',  5),
        (13, 'example 4',          37.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks', 236, 'phone',  5),
        (14, 'example 5',          73.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks', 281, 'phone',  5),
        (15, 'example 6',         128.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks', 317, 'phone',  5),
        (16, 'example 7',         164.90, 'lorem ipsum ioewtybnz sdfjiowep lgjreuoq dfljoqp zahb alks',  44, 'phone',  5);

    INSERT INTO Customer (id, name, address) VALUES
        (1, 'Mr Anderson', '42 The Matrix'),
        (2, 'Ms Munchkin', '1 Yellow Brick Road, Ozshire');

    INSERT INTO `Order` (id, customer) VALUES
        (1, 1),
        (2, 2);

    INSERT INTO OrderLine (`order`, product, quantity, price) VALUES
        (1, 5, 1, 320),
        (1, 2, 1, 599.99),
        (2, 5, 2, 310);

 */
