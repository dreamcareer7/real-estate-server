var fs = require('fs');

var migrate = require('@gustavnikolaj/migrate');
var db = require('./db.js');

var loadedState;

var sql_load = fs.readFileSync(__dirname + '/../sql/migration/load.sql').toString();
var sql_save = fs.readFileSync(__dirname + '/../sql/migration/save.sql').toString();

function saveState(state, cb) {
  if(state.pos === loadedState.pos)
    return cb();

  db.conn( (err, conn) => {
    if(err)
      return cb(err);

    conn.query(sql_save, [state], cb);
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
        return cb(null, {});

      loadedState = res.rows[0].state;
      return cb(null, loadedState);
    });
  });
}

function performMigration() {
  var set = migrate.load({
    save: saveState,
    load: loadState
  }, 'migrations');

  set.on('migration', function(migration, direction){
    console.log('migrating', direction, migration.title);
  });

  set['up']( (err) => {
    if (err) {
      console.log('error while migrating', err);
      process.exit(1);
    }

    set.save( (err) => {
      if(!err)
        return ;

      console.log('Migration was successfull, but we were unable to save migration data. This needs human supervision:', err);
      process.exit(1);
    });
  });
}

module.exports = () => performMigration()
