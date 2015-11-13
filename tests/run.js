var fs      = require('fs');
var program = require('commander');
var config  = require('../lib/config.js');
var fork    = require('child_process').fork;
var async   = require('async');
var colors = require('colors');
var EventEmitter = require('events');

global.Run = new EventEmitter;

program
  .usage('[options] <suite> <suite>')
  .option('-d, --disable-ui', 'Disable UI and show debug output from the app')
  .option('-s, --server <server>', 'Instead of setting your own version, run tests against <server>')
  .option('-c, --concurrency <n>', 'Number of suites to run at the same time (defaults to 20)')
  .option('--curl', 'Throw curl commands (disabled ui)')
  .option('--disable-response', 'When in curl mode, do not write responses to stdout')
  .option('--keep', 'Keep the server running after execution is completed')
  .parse(process.argv);

if(!program.concurrency)
  program.concurrency = 20;

if(program.curl) {
  program.disableUi = true;
  require('./curl.js')(!program.disableResponse);
}

if(!program.disableUi)
  require('./ui.js')


var getSuites = function(cb) {
  if(program.args.length > 0)
    return cb(null, program.args);

  var files = fs.readdirSync(__dirname+'/suites');
  var suites = files
        .filter( (file) => file.substring(file.length-3, file.length) === '.js' )
        .map( (file) => file.replace('.js', '') );
  cb(null, suites);
}


function spawnProcesses(cb) {
  getSuites( (err, suites) => {
    if(err)
      return cb(err);

    suites.map((suite) => Run.emit('register suite', suite));

    async.mapLimit(suites, program.concurrency, spawnSuite, cb);
  })
}

function spawnSuite(suite, cb) {
  var url = program.server ? program.server : 'http://localhost:' + config.tests.port;

  var runner = fork(__dirname+'/runner.js', [suite, url]);

  Run.emit('spawn', suite);

  runner.on('message', (m) => {
    Run.emit('message', suite, m);
  });

  runner.on('exit', () => {
    Run.emit('suite done', suite);
    cb();
  });
}

var Domain = require('domain');
var db = require('../lib/utils/db');

var connections = {};

var database = (req, res, next) => {
  var domain = Domain.create();
  var suite = req.headers['x-suite'];

  if(connections[suite]) {
    domain.db = connections[suite];
    domain.run(next);
    return ;
  }

  db.conn( (err, conn, done) => {
    conn.done = done;
    conn.query('BEGIN', (err) => {
      connections[suite] = conn;
      domain.db = conn;
      domain.run(next);
    });
  });
}

function setupApp(cb) {
  var app = require('../lib/bootstrap.js')();
  app.use(database);

  if(!program.keep) {
    Run.on('suite done', (suite) => {
      connections[suite].query('ROLLBACK', connections[suite].done);
      delete connections[suite];
    })
  }

  Run.emit('app ready', app);
  app.listen(config.tests.port);
  cb();
}

var steps = [];

if(!program.server)
  steps.push(setupApp);

steps.push(spawnProcesses);

async.series(steps, (err) => {
  if(err) {
    console.log(err);
  }

  if(!program.keep)
    process.exit();
});