var fs      = require('fs');
var jasmine = require('jasmine-node');
var async   = require('async');
var program = require('commander');
var config  = require('../lib/config.js');

global.frisby = require('frisby');
global.results = {};

program
  .usage('[options] <spec> <spec>')
  .option('-t', '--trace')
  .parse(process.argv);

frisby.globalSetup({
  timeout: 10000,
  request: {
    json: true,
    baseUri:'http://localhost:' + config.tests.port
  }
});


function prepareTasks(cb) {
  function runFrisbies(tasks) {
    var runF = function(task, cb) {
      task.fn((err, res) => {
        global.results[task.spec][task.name] = res.body;
        cb(err, res);
      }).toss();
    };

    async.forEachSeries(tasks, runF);
  }

  var frisbies = [];
  var registerSpec = (spec) => {
    var fns = require('./tests/' + spec + '.js');

    if(!results[spec])
      results[spec] = {};

    Object.keys(fns).map( (name) => {
      frisbies.push({
        spec:spec,
        name:name,
        fn:fns[name]
      });
    });
  };

  var getSpecs = function(cb) {
    if(program.args.length > 0)
      return cb(null, program.args);

    var files = fs.readdirSync(__dirname+'/tests');
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
  require('../lib/bootstrap.js')({
    port: config.tests.port,
    database: '../tests/database.js',
    logger: '../tests/logger.js'
  });

  setTimeout(cb, 500);
}

function setupJasmine() {
  var jasmineEnv = jasmine.getEnv();
  jasmineEnv.updateInterval = 250;

  var print = function print(str) {
    process.stdout.write(str);
  };

  var reporter = new jasmine.TerminalReporter({
    print: print,
    color: true,
    includeStackTrace: program.trace,
    onComplete: (runner) => {
      var code = runner.results().failedCount > 0;
      process.exit(code);
    }
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
