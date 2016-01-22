var fs = require('fs');
require('colors');

var migrate = require('migratus')({
  loader: loadState,
  saver: saveState,
  directory: __dirname + '/../../migrations'
});

migrate.on('migrate failed', (name, direction, err) => {
  console.log('Migration failed'.red, name.yellow, err);
});

migrate.on('migrate succeeded', (name, direction) => {
  console.log('Migration succeeded'.green, name.yellow);
});

var db = require('./db.js');

var loadedState;

var sql_load = fs.readFileSync(__dirname + '/../sql/migration/load.sql').toString();
var sql_save = fs.readFileSync(__dirname + '/../sql/migration/save.sql').toString();

function saveState(state, cb) {
  db.conn( (err, conn) => {
    if(err)
      return cb(err);

    conn.query(sql_save, [JSON.stringify(state)], cb);
  });
}

function loadState(cb) {
  db.conn( (err, conn) => {
    if(err)
      return cb(err);

    conn.query(sql_load, (err, res) => {
      if(err)
        return cb(err);

      if(res.rows.length < 1)
        return cb(null, []);

      loadedState = res.rows[0].state;
      if(!Array.isArray(loadedState))
        loadedState = [];

      return cb(null, loadedState);
    });
  });
}

function performMigration() {
  migrate.up( err => {
    if(err) {
      console.log('Migrations failure:', err);
      process.exit();
    }
  });
}

module.exports = () => performMigration()
