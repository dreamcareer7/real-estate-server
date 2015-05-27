var newrelic = require('newrelic');
var bodyParser = require('body-parser');
var express = require('express');
var fs = require('fs');
var app = express();
var http = require('http').Server(app);
var https = require('https');
var config = require('./config.js');
var compress = require('compression');

var privateKey = fs.readFileSync('lib/sslcert/server.key');
var certificate = fs.readFileSync('lib/sslcert/server.crt');
var options = {key: privateKey, cert: certificate};

app.use(compress());
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

var files = [
  'utils/logger.js',
  'models/index.js',

  'auth/auth.js',

  'utils/route_middleware.js',

  'controllers/user.js',
  'controllers/event.js',
  'controllers/agency.js',
  'controllers/session.js',
  'controllers/listing.js',
  'controllers/shortlist.js',
  'controllers/recommendation.js',
  'controllers/contact.js',
  'controllers/xmpp.js',
  'controllers/message_room.js',
  'controllers/message.js',
  'controllers/alert.js',
  'controllers/invitation.js',
  'controllers/media.js',
  'controllers/notification.js',
  'controllers/admin.js'
]

for(var i in files)
  require('./' + files[i])(app);

http.listen(config.http.port);
https.createServer(options, app).listen(config.http.sport);