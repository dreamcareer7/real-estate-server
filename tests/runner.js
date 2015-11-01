var jasmine = require('jasmine-node');
var config = require('../lib/config.js');
var async = require('async');

global.frisby = require('frisby');
global.results = {};

frisby.globalSetup({
  timeout: 20000,
  request: {
    json: true,
    baseUri:'http://localhost:' + config.tests.port,
    headers: {
      'x-suite' : process.argv[2]
    }
  }
});

var runFrisbies = function(tasks) {
  var runF = function(task, cb) {
    task.fn((err, res) => {
      global.results[task.suite][task.name] = res.body;
      cb(err, res);
    }).toss();
  };

  async.forEachSeries(tasks, runF);
}

var prepareTasks = function() {
  var frisbies = [];
  global.registerSuite = (suite, tests) => {
    var fns = require('./suites/' + suite + '.js');

    if(!results[suite])
      results[suite] = {};

    Object.keys(fns)
    .filter( (name) => (!tests || tests.indexOf(name) > -1) )
    .map( (name) => {
      frisbies.push({
        suite:suite,
        name:name,
        fn:fns[name]
      });
    });

    return fns;
  };

  registerSuite('authorize');
  registerSuite(process.argv[2]);

  return frisbies;
}

function reportData(test) {
  var results = test.results();

  var data = {
    name:test.getFullName(),
    description:test.description,
    total:results.totalCount,
    passed:results.passedCount,
    failed:results.failedCount,
    messages:[]
  }

  results.items_.forEach( (item) => {
    if(item.failedCount < 1)
      return ;

    item.items_.forEach( (err) => {
      data.messages.push(err.message)
    })
  });

  process.send({
    code:'test done',
    test:data
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

  reporter.reportSuiteResults = reportData;
  reporter.reportRunnerResults = process.exit;

  jasmineEnv.addReporter(reporter);

  jasmineEnv.execute();
}


runFrisbies(prepareTasks());
setupJasmine();