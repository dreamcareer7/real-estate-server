var jasmine = require('jasmine-node');
var config = require('../lib/config.js');
var async = require('async');

global.frisby = require('frisby');
global.results = {};

frisby.globalSetup({
  timeout: 30000,
  request: {
    json: true,
    baseUri:process.argv[3],
    headers: {}
  }
});

var runFrisbies = function(tasks) {
  var runF = function(task, cb) {
    var f = task.fn((err, res) => {
      if(res.body)
        global.results[task.suite][task.name] = res.body;

      cb(err, res);
    });

    f.current.outgoing.headers['x-suite'] = process.argv[2];
    f.current.outgoing.headers['x-original-suite'] = task.suite;
    f.current.outgoing.headers['x-test-name'] = task.name;
    f.current.outgoing.headers['x-test-description'] = f.current.describe;

    f.toss();
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