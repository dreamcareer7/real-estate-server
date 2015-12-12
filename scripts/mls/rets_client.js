require('../connection.js');

var async = require('async');
var db = require('../../lib/utils/db.js');
var config = require('../../lib/config.js');
var _u = require('underscore');
var EventEmitter = require('events');
var dd = require('datadog-metrics');

require('../../lib/models/index.js')();

Error.autoReport = false;

var Client = new EventEmitter;
Client.options = {};

var retsLoginUrl = config.ntreis.login_url;
var retsUser     = config.ntreis.user;
var retsPassword = config.ntreis.password;

var client = require('rets-client').getClient(retsLoginUrl, retsUser, retsPassword);
Client.rets = client;

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
    '.' + (this.getMilliseconds() / 1000).toFixed(3).slice(2, 5) +
    '+';
}

function byMatrixModifiedDT(a, b) {
  var a_ = new Date(a.MatrixModifiedDT);
  var b_ = new Date(b.MatrixModifiedDT);

  if(a_ > b_)
    return 1;
  else if(b_ > a_)
    return -1;
  else
    return 0;
}

function byMatrix_Unique_ID(a, b) {
  var a_ = parseInt(a.Matrix_Unique_ID || a.matrix_unique_id);
  var b_ = parseInt(b.Matrix_Unique_ID || b.matrix_unique_id);

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

  var s = 'SELECT * FROM ntreis_jobs WHERE resource = $1 AND class = $2 ORDER BY created_at DESC LIMIT 1';
  db.query(s, [Client.options.resource, Client.options.class], (err, res) => {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      Client.last_run = {};
    else {
      Client.last_run = res.rows[0];
    }

    cb();
  });
}

function saveLastRun(data, cb) {
  if(!data || data.length < 1)
    return cb('No data was fetched');

  var last_date = null;
  var last_mui  = null;

  if(data.length > 0) {
    data.sort(byMatrixModifiedDT);
    var last_date = data[data.length -1].MatrixModifiedDT;

    data.sort(byMatrix_Unique_ID);
    var last_mui =  data[data.length -1].Matrix_Unique_ID || data[data.length -1].matrix_unique_id;
  }

  var job = {
    last_modified_date:last_date,
    last_id:parseInt(last_mui),
    results:data.length,
    query:Client.query,
    is_initial_completed:Client.last_run.is_initial_completed || shouldTransit,
    class:Client.options.class,
    resource:Client.options.resource
  };

  MLSJob.insert(job, cb);
}

var connected = false;
function connect(cb) {
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
}

function fetch(cb) {
  var by_id    = Client.options.by_id || !(Client.last_run.is_initial_completed);
  var last_id  = Client.last_run.last_id ? Client.last_run.last_id : 0;
  var last_run = Client.last_run.last_modified_date;

  var timeoutReached = false;
  var timeout = setTimeout(function() {
    timeoutReached = true;
    cb('Timeout while querying RETS server');
  }, config.ntreis.timeout);

  var timeoutMessage = console.log.bind(console.log,
    'We got a response, but it was way too late. We already consider it a timeout.');



  if(Client.options.query)
    Client.query = Client.options.query;
  else {
    var query = (by_id) ? ('(MATRIX_UNIQUE_ID='+last_id +'+)') :
              ('(MatrixModifiedDT=' + last_run.toNTREISString() + ')');

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

    if (err)
      return cb(err);

    Client.emit('data fetched', data);

    if(Client.last_run && Client.last_run.is_initial_completed === false && (data.length < Client.options.limit)) {
      Client.emit('initial completed');
    }

    return cb(null, data);
  }

  Client.emit('starting query', Client.query);
  client.query(Client.options.resource, Client.options.class, Client.query, processResponse, Client.options.limit);

//   client.getAllTable( function(err, tables) {
//     console.log(JSON.stringify(tables));
//   } );

//   client.getObject('Media', 'LargePhoto', '15612756', (a,b,c,d) => {
//     console.log(a,b,c.toString(),d)
//   });

//   client.getResources( (a,b,c) => console.log(a,b,c) );

//   client.getAllForeignKeys( (a,b,c) => console.log(a,b,c) );
//     client.getClass('Media', (a,b,c) => console.log(a,b,c) );
//     client.getObjectMeta('Media', (a,b,c) => console.log(a,b,c) );
}

var raw_insert = 'INSERT INTO mls_data (resource, class, value) VALUES ($1, $2, $3)';

var raw = (cb, results) => {
  var data = _u.clone(results.mls);

  async.mapLimit(data, 100, (l,cb) => db.query(raw_insert, [
    Client.options.resource,
    Client.options.class, l
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
    if(!shouldTransit)
      return cb(err, res);

    transit(cb)
  });
}

var dd_enabled = !!config.datadogs.api_key;

if(dd_enabled)
  dd.init({
    apiKey:config.datadogs.api_key
  });

var meters = {};
Client.increment = (name) => {
  if(!meters[name])
    meters[name] = 0;

  meters[name]++;

  if(dd_enabled)
    dd.increment('mls.'+name);
}

Client.getMetric = name => meters[name] || 0;

module.exports = Client;