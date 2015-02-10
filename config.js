module.exports = {
    apiCallDelay: 100,
    apiKey: 'orewgthwoetgoirwejgboerigqt',
    mysql: {
        host:'localhost',
        user:'dbprin',
        password:'weiothbgdls',
        database: 'dbprin'
    },
    expressStatic: {
        maxAge: 5*60*1000, /* fiveMinutes */
        extensions: [ "html" ]
    },
    bodyParser_JSON: {
        limit: 4096
    },
    port: process.env.PORT || 8080
}
