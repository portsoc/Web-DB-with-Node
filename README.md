an example, originally for DBPRIN 2014, of how to put a database on the Web
with Node.js

### Files

 - `config.js` – configuration options
 - `static/*` – static pages and client code
 - `server.js` – MySQL-backed API server
 - `server-inmemory.js` – simple, in-memory version of the server
 - `database.sql` – the SQL commands to set up the database
 - `package.json` – defines the dependencies of this package.

### Installation

#### Instructions when using a university VM

 1. On your VM, clone the source code for the server
   - `git clone https://github.com/portsoc/Web-DB-with-Node.git`
 2. In the directory `Web-DB-with-Node`, run `npm install`
   - `cd Web-DB-with-Node`
   - `npm install`
 3. Start the in-memory server
   - `npm start`
 4. Point your browser to your VM's IP address, check that the online shop works as it did in the lecture
 5. Explore and tweak the webpages and scripts in `static/` to understand how they work

If you're also interested in the server code:

 4. Set up your MySQL database
   - see `database.sql` for the code with the database schema and sample data
   - fill the username, password, and database name in `config.js`
 5. Run `node server.js` instead of `npm start`
   - to drop the delay for API calls (by default 1s), change the `1000` in `config.js` to `0`
   - if you've changed your `config.js` or any server source code, kill the server (e.g. with `Ctrl-C`) and start it again

#### Instructions for others new to Node.js

 1. Make sure you have `node.js` and `npm` installed
 2. Download or clone the source code for the server
   - `git clone https://github.com/portsoc/Web-DB-with-Node.git`
 3. In the directory with `package.json`, run `npm install`
   - `cd Web-DB-with-Node`
   - `npm install`
 4. Set up your MySQL database
   - see `database.sql` for the code with the database schema and sample data
   - fill the username, password, and database name in `config.js`
 5. Run `node server.js`
   - if you want to change the port at which the server listens (the default is 8080), you can run `PORT=yournumber node server.js` or put your preferred port number in `config.js`
   - to drop the delay for API calls (by default 1s), change the `1000` in `config.js` to `0`
   - if you've changed your `config.js`, kill the server (e.g. with `Ctrl-C`) and start it again
