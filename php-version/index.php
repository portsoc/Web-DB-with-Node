<?php
/**
 * A subset of the API is presented here using
 * PHP to illistrate that the API is an interface
 * and that the client can and should be completely
 * agnostic and unaware of the technology that is
 * fulfilling it's requests.
 *
 *
 * Implemented:
 *    GET /api/categories
 *    GET /api/categories/:id/
 */


include __DIR__.'/config.php';
include __DIR__.'/db.php';


// array of function names that are allowed to be called
$whitelist = [ "categories" ];
$path = explode('/', ltrim($_SERVER['REQUEST_URI'], "/"));

// if the URL does not begin with /api
// then throw toys from the pram
if ($path[0] != "api") {
    send($path[0] . " not served here.", 404, "Not Found");
    exit(0);
}

// ensure only names in the whitelist
// are called and error if otherwise
if (in_array($path[1], $whitelist)) {
    call_user_func($path[1], $path);
} else {
    send($path[1] . " is not a valid API endpoint, sorry!", 404, "Not Found");
}


/**
 * Send a structured object to the client, setting
 * the HTTP headers as it does so.
 *
 * @param $results the result object to be serialized and sent
 * @param $code the HTTP status code to use (default: 200)
 * @param $msg the HTTP status message to use (default: OK)
 */
function send($results, $code = 200, $msg = "OK") {
    header("HTTP/1.1 ${code} ${msg}");
    header("Content-Type: application/json");
    echo json_encode($results, JSON_PRETTY_PRINT);
}


/**
 * Handler for
 * /api/categories and
 * /api/categoris/:id/
 * which calls th eappropriate function
 */
function categories($path) {
    $result = [];
    if ($_SERVER['REQUEST_METHOD'] == "GET") {
      if (isset($path[2]) && strlen(trim($path[2])) != 0) {
        $result = listProducts($path[2]);
      } else {
        $result = listCategories();
      }
    }
    send( $result );
}


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
function listCategories() {
    $results = [];
    try {
        $DB = new DB();

        $rows = $DB->query(
          "SELECT id, name FROM Category ORDER BY priority, name"
        );

        foreach ($rows as $row) {
            $results[] = array(
              'title' => $row["name"],
              'productsURL' => "/api/categories/" . $row["id"]
          );
        }
    } catch (DBException $dbx) {
        error_log($dbx);
    }

    return array( 'categories' => $results );
}


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
function listProducts($id) {
  $query =
    "SELECT C.name, S.name, P.name, P.price, P.description, P.stock, P.id
     FROM Category C
     JOIN Product P on C.id = P.category
     JOIN Supplier S on S.id = P.supplier
     WHERE P.category = ?
     ORDER BY P.name";

  $DB = new DB();
  $rows = $DB->query($query, array($id));

  if (count($rows) == 0) {
      send('no such category: '.$id, 404, "not found");
      exit(0);
  }

  $prod = array(
      'category' => $rows[0][0],
      'products' => array()
    );

    foreach ($rows as $row) {
      $x = array();
      $x["title"] = $row["name"];
      $x["price"] = floatval( $row["price"]);
      $x["description"] = $row["description"];
      $x["stock"] = intval( $row["stock"] );
      $x["supplier"] = $row["1"] ;

      $prod["products"][$row["id"]] = $x;
    }

 return $prod;
}
?>
