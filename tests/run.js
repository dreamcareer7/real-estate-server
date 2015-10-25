var jasmine = require('jasmine-node');
global.frisby = require('frisby');
var async  = require('async');
var config = require('../lib/config.js');

var spec = process.argv[2];

function runFrisbies(tasks) {
  var runF = function(task, key, cb) {
    task(cb).toss();
  }

  async.forEachOfSeries(tasks, runF);
}

var frisbies = {};
var registerFile = (filename) => {
  var fns = require(filename);
  Object.keys(fns).map( (name) => frisbies[name] = fns[name] )
}

require('./init.js')( () => {
  registerFile('./tests/'+spec+'.js');
  runFrisbies(frisbies);
}).toss();

function setupApp(cb) {
  require('../lib/index.js')({
    port:config.tests.port,
    database:'../tests/database.js'
  })

  setTimeout(cb, 500);
}

function setupJasmine() {
  var jasmineEnv = jasmine.getEnv();
  jasmineEnv.updateInterval = 250;

  var print = function print(str) {
    process.stdout.write(str);
  }

  var reporter = new jasmine.TerminalReporter({
    print: print,
    color: true,
    includeStackTrace: false,
    onComplete: process.exit
  });
  jasmineEnv.addReporter(reporter);

  jasmineEnv.execute();
}

setupApp(setupJasmine);