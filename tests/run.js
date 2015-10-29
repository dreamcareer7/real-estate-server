var fs      = require('fs');
var jasmine = require('jasmine-node');
var async   = require('async');
var program = require('commander');
var config  = require('../lib/config.js');

global.frisby = require('frisby');
global.results = {};

program
  .usage('[options] <spec> <spec>')
  .option('-s, --sql', 'Run queries against database when running tests is over')
  .option('-t, --trace', 'Show stack traces')
  .parse(process.argv);

frisby.globalSetup({
  timeout: 20000,
  request: {
    json: true,
    baseUri:'http://localhost:' + config.tests.port
  }
});

function prepareTasks(cb) {
  runFrisbies = function(tasks) {
    var runF = function(task, cb) {
      task.fn((err, res) => {
        global.results[task.spec][task.name] = res.body;
        cb(err, res);
      }).toss();
    };

    async.forEachSeries(tasks, runF);
  }

  var frisbies = [];
  global.registerSpec = (spec, tests) => {
    var fns = require('./specs/' + spec + '.js');

    if(!results[spec])
      results[spec] = {};

    Object.keys(fns)
    .filter( (name) => (!tests || tests.indexOf(name) > -1) )
    .map( (name) => {
      frisbies.push({
        spec:spec,
        name:name,
        fn:fns[name]
      });
    });

    return fns;
  };

  var getSpecs = function(cb) {
    if(program.args.length > 0)
      return cb(null, program.args);

    var files = fs.readdirSync(__dirname+'/specs');
    var specs = files
          .filter( (file) => file.substring(file.length-3, file.length) === '.js' )
          .map( (file) => file.replace('.js', '') );
    cb(null, specs);
  }

  getSpecs( (err, specs) => {
    if(err)
      return cb(err);

      var authorizeIndex = specs.indexOf('authorize');
      if(authorizeIndex > -1)
        specs.splice(specs.indexOf('authorize'), 1);

      specs.unshift('authorize');

      specs.map( (spec) => registerSpec(spec) );

      runFrisbies(frisbies);

      cb();
  })
}

function setupApp(cb) {
  var prepareDatabase = () => {
    var Domain = require('domain');
    var db = require('../lib/utils/db');

    var domain = Domain.create();

    db.conn( (err, conn) => {
      conn.query('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE', (err) => {
        domain.db = conn;
        domain.enter();
      });
    });

    module.exports = () =>{};
  }

  require('../lib/bootstrap.js')({
    port: config.tests.port,
    database: prepareDatabase,
    logger: '../tests/logger.js'
  });

  setTimeout(cb, 500);
}

var jasmineEnv;
function setupJasmine() {
  jasmineEnv = jasmine.getEnv();
  jasmineEnv.updateInterval = 250;

  var print = function print(str) {
    process.stdout.write(str);
  };

  var exit = (runner) => {
    if(program.sql)
      return ;

    var code = runner.results().failedCount > 0;
    process.exit(code);
  }

  var reporter = new jasmine.TerminalReporter({
    print: print,
    color: true,
    includeStackTrace: program.trace,
    onComplete: exit
  });
  jasmineEnv.addReporter(reporter);

  jasmineEnv.execute();
}

setupApp( () => {
  prepareTasks( (err) => {
    if(err) {
      console.log(err);
      process.exit();
    }

    setupJasmine()
  });
});


var pretty = require('prettyjson').render;

var query = (sql) => {
  savePoint( (err) => {
    if(err) {
      console.log(err.toString().red);
      return ;
    }

    process.domain.db.query(sql.toString().trim(), (err, res) => {
      if(err) {
        console.log(err.toString().red);
        process.domain.db.query('ROLLBACK TO SAVEPOINT point', () => {})
        return ;
      }
      console.log(pretty(res.rows));
    })
  })
}

var savePoint = (cb) => {
  process.domain.db.query('SAVEPOINT point', cb);
}

process.stdin.on('data', (command) => {
  var command = command.toString().trim();
  if(!command)
    return ;

  query(command)
});