var migrate = require('migrate');

function performMigration() {
  var state = __dirname+'/../../migrations/state';
  var set = migrate.load(state, 'migrations');

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

      console.log('Migration was successfull, but we were unable to save migration data. This needs human supervision:', err)
      process.exit(1);
    });
  });
}

module.exports = () => performMigration()
