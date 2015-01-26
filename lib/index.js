var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var config = require('./config.js');
var compress = require('compression');

app.use(compress());
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

var files = [
  'models/index.js',
  'utils/logger.js',

  'auth/auth.js',

  'utils/route_middleware.js',

  'controllers/user.js',
  'controllers/event.js',
  'controllers/agency.js',
  'controllers/session.js',
  'controllers/listing.js',
  'controllers/shortlist.js',
  'controllers/recommendation.js',
  'controllers/xmpp.js'
]

for(var i in files)
  require('./' + files[i])(app);

http.listen(config.http.port);