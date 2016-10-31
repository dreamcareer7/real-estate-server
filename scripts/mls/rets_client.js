require('../connection.js');

var async = require('async');
var db = require('../../lib/utils/db.js');
var config = require('../../lib/config.js');
var _u = require('underscore');
var EventEmitter = require('events');
var util = require('util');

var Client = new EventEmitter;
Client.options = {};

var retsLoginUrl = config.ntreis.login_url;
var retsUser     = config.ntreis.user;
var retsPassword = config.ntreis.password;

Date.prototype.toNTREISString = function() {
  var pad = function(number) {
    if (number < 10) {
      return '0' + number;
    }
    return number;
  }

  return this.getUTCFullYear() +
    '-' + pad(this.getMonth() + 1) +
    '-' + pad(this.getDate()) +
    'T' + pad(this.getHours()) +
    ':' + pad(this.getMinutes()) +
    ':' + pad(this.getSeconds()) +
    '.' + (this.getMilliseconds() / 1000).toFixed(3).slice(2, 5)
}

function sortByModified(a, b) {
  var a_ = new Date(a[Client.options.fields.modified]);
  var b_ = new Date(b[Client.options.fields.modified]);

  if(a_ > b_)
    return 1;
  else if(b_ > a_)
    return -1;
  else
    return 0;
}

function sortById(a, b) {
  var a_ = parseInt(a[Client.options.fields.id]);
  var b_ = parseInt(b[Client.options.fields.id]);

  if(a_ > b_)
    return 1;
  else if(b_ > a_)
    return -1;
  else
    return 0;
}

function getLastRun(cb) {
  if(Client.options.startFrom) {
    var t = new Date((new Date()).getTime() - (Client.options.startFrom * 3600000));

    Client.last_run = {
      last_modified_date:t,
      is_initial_completed:true
    };

    return cb();
  }

  MLSJob.getLastRun(Client.options.job, (err, last_run) => {
    if(err)
      return cb(err);
    if(!last_run)
      last_run = {};

    Client.last_run = last_run;

    cb();
  });
}

function saveLastRun(data, cb) {
  if(!data || data.length < 1)
    return cb('No data was fetched');

  var last_date = null;
  var last_mui  = null;

  if(data.length > 0) {
    data.sort(sortByModified);
    var last_date = data[data.length -1][Client.options.fields.modified];

    data.sort(sortById);
    var last_mui =  data[data.length -1][Client.options.fields.id];
  }

  var job = {
    last_modified_date:last_date,
    last_id:parseInt(last_mui),
    results:data.length,
    query:Client.query,
    is_initial_completed:Client.last_run.is_initial_completed || shouldTransit,
    name:Client.options.job,
    limit:Client.options.limit,
    offset:Client.options.offset
  };

  Client.emit('saving job', job);

  MLSJob.insert(job, cb);
}

var client;
var connected = false;
function connect(cb) {
  client = require('rets-client').getClient(retsLoginUrl, retsUser, retsPassword);
  Client.rets = client;
  
  if(connected)
    return cb();

  var timeoutReached = false;
  var timeout = setTimeout(function() {
    timeoutReached = true;
    cb('Timeout while connecting to RETS server');
  }, config.ntreis.timeout);

  var timeoutMessage = console.log.bind(console.log,
    'We got a response, but it was way too late. We already consider it a timeout.');

  client.once('connection.success', function() {
    if(timeoutReached)
      return timeoutMessage();

    clearTimeout(timeout);

    connected = true;
    cb();
  });

  client.once('connection.failure', cb);
}

function fetch(cb) {
  var by_id    = !(Client.last_run.is_initial_completed);
  var last_id  = Client.last_run.last_id ? Client.last_run.last_id : 0;
  var last_run = Client.last_run.last_modified_date;

  var timeoutReached = false;
  var timeout = setTimeout(function() {
    timeoutReached = true;
    cb('Timeout while querying RETS server');
  }, config.ntreis.timeout);

  var timeoutMessage = console.log.bind(console.log,
    'We got a response, but it was way too late. We already consider it a timeout.');


  //TODO: Later, due to pagination, we might decide to change the query. We should log there.
  if(Client.options.query)
    Client.query = Client.options.query;
  else {
    var query;
    var q = '(%s=%s+)';
    if(by_id) {
      query = util.format(q, Client.options.fields.id, last_id);
    } else {
      query = util.format(q, Client.options.fields.modified, last_run.toNTREISString());
    }

    if(by_id && Client.options.additionalQuery)
      query += ','+Client.options.additionalQuery;

    Client.query = query;
  }

  console.log('Query'.yellow, Client.query.cyan);

  var processResponse = function(err, data) {
    if(timeoutReached)
      return timeoutMessage();

    clearTimeout(timeout);

    if(Client.last_run && Client.last_run.is_initial_completed === false) {
      if(err && err.replyCode == '20201') {
        Client.emit('initial completed');
        return cb(null, []);
      }
    }

    if(err && err.replyCode == '20201') //Not an error. Just no results.
      return cb(null, []);

    if (err)
      return cb(err);

    Client.emit('data fetched', data);

    if(Client.last_run && Client.last_run.is_initial_completed === false && (data.length < Client.options.limit)) {
      Client.emit('initial completed');
    }

    return cb(null, data);
  }

  if (Client.options.offset === undefined && Client.last_run && Client.last_run.limit && Client.last_run.limit <= Client.last_run.results) {
    if (!Client.last_run.offset)
      Client.last_run.offset = 0;
    Client.options.offset = Client.last_run.offset + parseInt(Client.options.limit);

    Client.query = Client.last_run.query;
  }

  Client.emit('starting query', Client.query);
  client.query(Client.options.resource, Client.options.class, Client.query, processResponse, Client.options.limit, Client.options.offset);

//   client.getAllTable( function(err, tables) {
//     console.log(JSON.stringify(tables));
//   } );

//   client.getResources( (a,b,c) => console.log(a,b,c) );

//   client.getAllForeignKeys( (a,b,c) => console.log(a,b,c) );
//     client.getClass('Office', (a,b,c) => console.log(a,b,c) );
//     client.getObjectMeta('Office', (a,b,c) => console.log(a,b,c) );
}

var raw_insert = 'INSERT INTO mls_data (resource, class, matrix_unique_id, value) \
  VALUES ($1, $2, $3, $4) ON CONFLICT (matrix_unique_id) DO UPDATE SET \
  value = EXCLUDED.value \
  WHERE mls_data.matrix_unique_id = $3 AND mls_data.value->>$5 < $6';

var raw = (cb, results) => {
  var data = _u.clone(results.mls);

  async.mapLimit(data, 100, (l,cb) => db.query(raw_insert, [
    Client.options.resource,
    Client.options.class,
    l[Client.options.fields.id],
    l,
    Client.options.fields.modified,
    l[Client.options.fields.modified]
  ], cb), cb);
}

function notice() {
  console.log('--------- Fetch options ---------'.yellow);
  console.log('Manual RETS Response Limit:'.yellow, Client.options.limit);
  console.log('Manual starting point:'.yellow, Client.options.startFrom);
}

var shouldTransit = false;

Client.on('initial completed', () => {
  console.log('initial fetch completed.');
  shouldTransit = true;
});

Client.work = function(options, cb) {
  Client.options = options;

  if(!Client.options.fields)
    Client.options.fields = {};

  if(!Client.options.fields.id)
    Client.options.fields.id = 'Matrix_Unique_ID';

  if(!Client.options.fields.modified)
    Client.options.fields.modified = 'MatrixModifiedDT';

  notice();

  var transit = (cb) => {
    shouldTransit = false; //Mark it as false again so we wont do this recursively

    options.startFrom = 24;
    Client.work(options, cb);
  }

  var save = (cb, results) => saveLastRun(results.mls, cb)

  var process = Client.options.processor ? Client.options.processor : cb => cb()

  var steps = {
    connect:connect,
    last_run:getLastRun,
    mls: ['connect', 'last_run', fetch],
    raw: ['mls', raw],
    process:['mls', process],
  };

  if(!Client.options.dontSave)
    steps.save = ['raw', 'process', save];

  if(Client.options.processor)
    steps.process = ['mls', Client.options.processor];

  async.auto(steps, (err, res) => {
    if(err) {
      Slack.send({
        channel: 'server-errors',
        text: '🏠 NTREIS Error on '+Client.options.job+'\n`'+JSON.stringify(err)+'`',
        emoji: ':skull:'
      }, () => {
        cb(err);
      });
      return ;
    }

    if(!shouldTransit)
      return cb(null, res);

    transit(cb)
  });
}

module.exports = Client;
