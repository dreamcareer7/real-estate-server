var db = require('../lib/utils/db');

var up_sql   = 'SOME SQL TO DO';
var down_sql = 'SOME SQL TO UNDO';

var runSql = (sql) => {
  return (next) => {
    db.conn( (err, client) => {
      if(err)
        return next(err);

      client.query(sql, next)
    })
  }
}

exports.up = runSql(up_sql);
exports.down = runSql(down_sql);