var db                      = require('../utils/db.js');

var sql_search  = require('../sql/school/search.sql');
var sql_refresh = require('../sql/school/refresh.sql');

School = {}

School.search = function(term, cb) {
  db.query(sql_search, [term], (err, res) => {
    if(err)
      return cb(err);

    return cb(null, res.rows);
  });
}


School.refresh = function(cb) {
  db.query(sql_refresh, [], cb);
}