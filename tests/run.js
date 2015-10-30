var fs      = require('fs');
var program = require('commander');
var config  = require('../lib/config.js');
var fork    = require('child_process').fork;
var clui    = require('clui');

program
  .usage('[options] <spec> <spec>')
  .option('-s, --sql', 'Run queries against database when running tests is over')
  .option('-t, --trace', 'Show stack traces')
  .parse(process.argv);

var getSpecs = function(cb) {
  if(program.args.length > 0)
    return cb(null, program.args);

  var files = fs.readdirSync(__dirname+'/specs');
  var specs = files
        .filter( (file) => file.substring(file.length-3, file.length) === '.js' )
        .map( (file) => file.replace('.js', '') );
  cb(null, specs);
}

function spawnProcesses(cb) {
  getSpecs( (err, specs) => {
    if(err)
      return cb(err);

    specs.map(spawnSpec);
  })
}

var results = {};

var updateUI = function() {
  process.stdout.write('\033[9A');

  Object.keys(results).forEach( (spec) => {
    var result = results[spec];

    var line = new clui.Line();
    line.column( ('Spec: '+spec).green, 40);

    if(results[spec]) {

      var s = '';

      result.forEach( (test) => {
        if(test.failed > 0)
          s += '■'.yellow;
        else
          s += '■'.green;
      });

      line.column(s, 40);

    } else {
      line.column('Waiting'.yellow, 40)
    }
    line.fill();
    line.output();

    if(!result) return ;
    result.forEach( (test) => {
//       if(test.failed > 0)
//         console.log(spec, test);
    });
  })
}

function spawnSpec(spec) {
  var runner = fork(__dirname+'/runner.js', [spec]);

  results[spec] = null;


  runner.on('message', (m) => {
    if(m.code !== 'done')
      return ;

    results[spec] = m.data;
    updateUI();

//     console.log('DONE', spec);
    connections[spec].query('ROLLBACK', connections[spec].release);
  });
}

var Domain = require('domain');
var db = require('../lib/utils/db');

var connections = {};

var database = (app) => {
  app.use( (req, res, next) => {
    var domain = Domain.create();
    var spec = req.headers['x-spec'];

    if(connections[spec]) {
      domain.db = connections[spec];
      domain.run(next);
      return ;
    }

    db.conn( (err, conn, release) => {
      var end = res.end;
      res.end = function(data, encoding, callback) {
        release();
        end.call(res, data, encoding, callback);
      }
      req.on('close', release);
      conn.query('BEGIN', (err) => {
        connections[spec] = conn;
        domain.db = conn;
        domain.run(next);
      });
    });
  })
}

function setupApp(cb) {
  require('../lib/bootstrap.js')({
    port: config.tests.port,
    database: database,
    logger: '../tests/logger.js'
  });

  setTimeout(cb, 500);
}

setupApp( () => {
  spawnProcesses( (err) => {
    if(err) {
      console.log(err);
      process.exit();
    }
  });
});