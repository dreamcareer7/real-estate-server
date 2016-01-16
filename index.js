var config = require('./lib/config.js');

var app = require('./lib/bootstrap.js')();

// For dev only
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

require('./lib/utils/atomic.js')(app);
require('./lib/utils/logger.js')(app);

app.listen(config.http.port);