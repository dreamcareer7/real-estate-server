var db                      = require('../utils/db.js');

var sql_search           = require('../sql/school/search.sql');
var sql_search_districts = require('../sql/school/search_districts.sql');
var sql_refresh          = require('../sql/school/refresh.sql');
var sql_district         = require('../sql/school/district.sql');

School = {}

School.search = function(term, cb) {
  db.query(sql_search, [term], (err, res) => {
    if(err)
      return cb(err);

    return cb(null, res.rows);
  });
}

School.getByDistrict = function(districts, cb) {
  db.query(sql_district, [districts], (err, res) => {
    if(err)
      return cb(err);

    return cb(null, res.rows);
  });
}

School.searchDistricts = function(terms, cb) {
  var terms = terms.map( t => '%' + t + '%' );

  if(terms.length < 1) // If there is no search term, return all.
    terms = ['%%'];

  db.query(sql_search_districts, [terms], (err, res) => {
    if(err)
      return cb(err);

    return cb(null, res.rows);
  });
}

School.refresh = function(cb) {
  db.query(sql_refresh, [], cb);
}