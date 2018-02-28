module.exports = {
  apiKey: 'orewgthwoetgoirwejgboerigqt',
  mysql: {
    host:'localhost',
    user:'dbprinHappyShop',
    password:'weiothbgdls',
    database: 'dbprinHappyShop',
  },
  expressStatic: {
    maxAge: 5*60*1000, /* fiveMinutes */
    extensions: ['html'],
  },
  bodyParser_JSON: {
    limit: 4096,
  },
  port: process.env.PORT || 8080,
  apiCallDelay: 1000,
};
