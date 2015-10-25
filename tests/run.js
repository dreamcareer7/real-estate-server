var jasmine = require('jasmine-node');
global.frisby = require('frisby');
var async  = require('async');
var program = require('commander');
var fs = require('fs');
var config = require('../lib/config.js');
global.results = {};

program
  .usage('[options] <spec> <spec>')
  .option('-t', '--trace')
  .parse(process.argv);

function prepareTasks(cb) {
  function runFrisbies(tasks) {
    var runF = function(task, key, cb) {
      task((err, res) => {
        global.results[key] = res;
        cb(err, res);
      }).toss();
    }

    async.forEachOfSeries(tasks, runF);
  }

  var frisbies = {};
  var registerFile = (filename) => {
    console.log('Registering file', filename);
    var fns = require(filename);
    Object.keys(fns).map( (name) => frisbies[name] = fns[name] )
  }

  var getSpecs = function(cb) {
    if(program.args.length > 0)
      return cb(null, program.args);

    var files = fs.readdirSync(__dirname+'/tests');
    var specs = files
      .filter( (file) => file.substring(file.length-3, file.length) === '.js' )
      .map( (file) => file.replace('.js', '') )
    cb(null, specs);
  }

  getSpecs( (err, files) => {
    if(err)
      return cb(err);

    require('./init.js')( () => {
      files.map( (file) => registerFile('./tests/'+file+'.js') )
      runFrisbies(frisbies);
    }).toss();
    cb();
  });
}

function setupApp(cb) {
  require('../lib/bootstrap.js')({
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
    includeStackTrace: program.trace,
    onComplete: process.exit
  });
  jasmineEnv.addReporter(reporter);

  jasmineEnv.execute();
}

prepareTasks( (err) => {
  if(err) {
    console.log(err);
    process.exit();
  }
  async.series([setupApp,setupJasmine]);
})