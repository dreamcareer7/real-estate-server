var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var config = require('./config.js');
var compress = require('compression');

app.use(compress());
app.use(bodyParser.json());

var files = [
  'models/Error.js',
  'models/Address.js',
  'models/User.js',
  'models/Event.js',
  'models/Agency.js',
  'models/Session.js',
  'models/Client.js',
  'models/Token.js',

  'auth/auth.js',
  'utils/route_middleware.js',
  
  'controllers/user.js',
  'controllers/event.js',
  'controllers/agency.js',
  'controllers/session.js'
]

for(var i in files)
  require('./'+files[i])(app);

http.listen(config.http.port);