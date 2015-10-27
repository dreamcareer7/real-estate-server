var newrelic = require('newrelic');

// if (process.env.NODE_ENV !== 'production') {
//   console.log('Enabling LongStack')
//   var superstack = require('superstack');
//   superstack.async_trace_limit = -1;
// }

var bodyParser = require('body-parser');
var express = require('express');
var fs = require('fs');
var app = express();
var http = require('http').Server(app);
var config = require('./config.js');
var compress = require('compression');
var colors = require('colors');

// We compress all responses if proper `Accept-Encoding` headers are set
// by requesting party.
app.use(compress());

app.use(bodyParser.json());

// Serving public directory contents by convention.
app.use(express.static(__dirname + '/public'));

// Pretty-printing JSON responses. This is not going to cause major
// issues on production since we compress our responses.
app.set('json spaces', 2);

var files = [
  'utils/migrate.js',
  'models/index.js',
  'auth/auth.js',
  'utils/route_middleware.js',
  'controllers/user.js',
  'controllers/session.js',
  'controllers/listing.js',
  'controllers/room.js',
  'controllers/recommendation.js',
  'controllers/contact.js',
  'controllers/xmpp.js',
  'controllers/message.js',
  'controllers/alert.js',
  'controllers/invitation.js',
  'controllers/media.js',
  'controllers/notification.js',
  'controllers/admin.js'
]

function setup(options) {
  if(!options)
    var options = {};

  var port     = options.port || config.http.port;
  var database = options.database || 'utils/atomic.js';
  var logger   = options.logger   || 'utils/logger.js';

  files.unshift(logger);
  files.unshift(database);
  files.map( (file) => require('./'+file)(app) );

  http.listen(port);
}

module.exports = setup;