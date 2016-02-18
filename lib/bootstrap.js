var newrelic   = require('newrelic');

var bodyParser = require('body-parser');
var express    = require('express');
var fs         = require('fs');
var app        = express();
var http       = require('http').Server(app);
var config     = require('./config.js');
var compress   = require('compression');
var colors     = require('colors');

// We compress all responses if proper `Accept-Encoding` headers are set
// by requesting party.
app.use(compress());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Serving public directory contents by convention.
app.use(express.static(__dirname + '/public'));

// Pretty-printing JSON responses. This is not going to cause major
// issues on production since we compress our responses.
app.set('json spaces', 2);

var middlewares = [
  'utils/migrate.js',
  'models/index.js',
  'auth/auth.js',
  'utils/route_middleware.js',
  'controllers/user.js',
  'controllers/agent.js',
  'controllers/session.js',
  'controllers/listing.js',
  'controllers/room.js',
  'controllers/recommendation.js',
  'controllers/contact.js',
  'controllers/message.js',
  'controllers/alert.js',
  'controllers/invitation.js',
  'controllers/media.js',
  'controllers/notification.js',
  'controllers/admin.js',
  'controllers/verification.js',
  'controllers/tag.js',
  'controllers/transaction.js',
  'controllers/important_date.js',
  'controllers/task.js',
  'controllers/office.js'
];

var load_middlewares = () => {
  middlewares.map((middleware) => require('./' + middleware)(app));
  require('./socket/index.js')(http);
};

function setup() {
  var listen = http.listen;

  app.listen = function() {
    load_middlewares();
    app.emit('after loading routes');
    listen.apply(http, arguments);
  };

  return app;
}

module.exports = setup;
