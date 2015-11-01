var fs      = require('fs');
var program = require('commander');
var config  = require('../lib/config.js');
var fork    = require('child_process').fork;
var clui    = require('clui');
var async   = require('async');

program
  .usage('[options] <suite> <suite>')
  .option('-d, --disable-ui', 'Disable UI and show debug output from the app')
  .parse(process.argv);

var getSuites = function(cb) {
  if(program.args.length > 0)
    return cb(null, program.args);

  var files = fs.readdirSync(__dirname+'/suites');
  var suites = files
        .filter( (file) => file.substring(file.length-3, file.length) === '.js' )
        .map( (file) => file.replace('.js', '') );
  cb(null, suites);
}

var results = {};
var requests = [];

var newline = () => new clui.Line(' ').fill();

var updateUI = function() {
  var screen = new clui.LineBuffer({
    x:0,
    y:0,
    width:'console',
    height:'console'
  });

  Object.keys(results).forEach( (suite) => {
    var result = results[suite];

    var line = new clui.Line(screen);

    var icons = {
      'Pending'  : '○',
      'Running'  : '◌',
      'Done'     : '●'
    }

    line.column( icons[result.state].green, 10);

    line.column( ('Suite: '+suite).green, 40);

    if(result.state === 'Pending') {
      line.column('Pending'.yellow)
    } else {
      var s = '';

      result.tests.forEach( (test) => {
        if(test.failed > 0)
          s += '■'.red;
        else
          s += '■'.green;
      });

      line.column(s, 40);
    }
    line.fill();
    line.store();


    if(!result) return ;
    result.tests.forEach( (test) => {
      if(test.failed < 1)
        return ;

      var line = new clui.Line(screen);
      line.padding(15).column(test.name.red, 600);
      line.fill().store();

      test.messages.forEach( (message) => {
        var line = new clui.Line(screen);
        line.padding(20).column(message.red, 600);
        line.fill().store();
      })
    });
  })

  screen.addLine(newline());

  requests.map( (req) => {
    var line = new clui.Line(screen);

    if(req.responseStatus > 499)
      var statusColor = 'red';
    else
      var statusColor = 'green';

    if(req.elapsed < 200) {
      var elapsedColor = 'green';
    } else if(req.elapsed < 1000) {
      var elapsedColor = 'yellow';
    } else {
      var elapsedColor = 'red';
    }

    line.column((req.elapsed.toString()+'ms')[elapsedColor], 8);
    line.column(req.responseStatus.toString()[statusColor], 5);
    line.column(req.method.toUpperCase()[statusColor], 8);
    line.column(req.path[statusColor]);
    line.fill().store();
  });

  if(program.disableUi)
    return ;

  process.stdout.write('\033[9A');
  screen.fill(newline());
  screen.output();
}

function logger(req, res, next) {
  var start = new Date().getTime();

  var end = res.end;
  res.end = function(data, encoding, callback) {
    requests.unshift({
      method:req.method,
      path:req.path,
      responseStatus:res.statusCode,
      elapsed: (new Date).getTime() - start
    });
    updateUI();
    end.call(res, data, encoding, callback);
  }

  next();
}

function spawnProcesses(cb) {
  getSuites( (err, suites) => {
    if(err)
      return cb(err);

    suites.map( (suite) => {
      results[suite] = {
        state:'Pending',
        tests:[]
      }
    })

    async.map(suites, spawSuite, cb);
  })
}

function spawSuite(suite, cb) {
  var runner = fork(__dirname+'/runner.js', [suite]);

  results[suite].state = 'Running';

  runner.on('message', (m) => {
    if(m.code !== 'test done')
      return ;

    results[suite].tests.push(m.test);
    updateUI();
  });

  runner.on('exit', () => {
    results[suite].state = 'Done';
    connections[suite].query('ROLLBACK', connections[suite].done);
    updateUI();
    cb();
  });
}

var Domain = require('domain');
var db = require('../lib/utils/db');

var connections = {};

var database = (app) => {
  app.use( (req, res, next) => {
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
  })
}

function setupApp(cb) {
  var app = require('../lib/bootstrap.js')({
    port: config.tests.port,
    database: database,
    logger: '../tests/logger.js',

    middleware: [logger]
  });

  process.nextTick(cb);
}

setupApp( () => {
  spawnProcesses( (err) => {
    if(err) {
      console.log(err);
    }
    process.exit();
  });
});