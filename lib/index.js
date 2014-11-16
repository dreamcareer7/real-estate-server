var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var config = require('./config.js');

app.use(bodyParser.urlencoded({extended:true}));

require('./models/Error.js')(app);
require('./models/User.js')(app);
require('./controllers/user.js')(app);

http.listen(config.http.port);