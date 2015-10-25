var Domain = require('domain');
var db = require('../lib/utils/db');

var domain = Domain.create();

db.conn( (err, conn) => {
  conn.query('BEGIN', (err) => {
    domain.db = conn;
    domain.enter();
  });
} );

module.exports = ()=>{}