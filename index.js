var config = require('./lib/config.js');

var app = require('./lib/bootstrap.js')();

require('./lib/utils/atomic.js')(app);
require('./lib/utils/logger.js')(app);

app.listen(config.http.port);