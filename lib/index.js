var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var config = require('./config.js');

app.use(bodyParser.json());

require('./models/Error.js')(app);

require('./models/Address.js')(app);
require('./models/User.js')(app);
require('./models/Event.js')(app);
require('./models/Agency.js')(app);

require('./utils/route_middleware.js')(app);

require('./controllers/user.js')(app);
require('./controllers/event.js')(app);
require('./controllers/agency.js')(app);


http.listen(config.http.port);