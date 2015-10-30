var jasmine = require('jasmine-node');
var config = require('../lib/config.js');
var async = require('async');

global.frisby = require('frisby');
global.results = {};

frisby.globalSetup({
  timeout: 40000,
  request: {
    json: true,
    baseUri:'http://localhost:' + config.tests.port,
    headers: {
      'x-spec' : process.argv[2]
    }
  }
});

var runFrisbies = function(tasks) {
  var runF = function(task, cb) {
    task.fn((err, res) => {
      global.results[task.spec][task.name] = res.body;
      cb(err, res);
    }).toss();
  };

  async.forEachSeries(tasks, runF);
}

var prepareTasks = function() {
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

  registerSpec('authorize');
  registerSpec(process.argv[2]);

  return frisbies;
}

function reportData(runner) {
  var data = [];


  runner.suites().forEach( (suite) => {
    var results = suite.results();

    data.push({
      name:suite.getFullName(),
      description:suite.description,
      total:results.totalCount,
      passed:results.passedCount,
      failed:results.failedCount
    })
  });

  process.send({
    code:'done',
    data
  });
}

function setupJasmine() {
  var jasmineEnv;
  jasmineEnv = jasmine.getEnv();
  jasmineEnv.updateInterval = 250;

  var print = function print(str) {
    process.stdout.write(str);
  };

  var reporter = new jasmine.JsApiReporter();

  reporter.reportRunnerResults = reportData;

  jasmineEnv.addReporter(reporter);

  jasmineEnv.execute();
}


runFrisbies(prepareTasks());
setupJasmine();