var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var sql = require('../utils/require_sql.js');

Tag = {};

var schema = {
  type: 'object',
  properties: {
    name: {
      required: true,
      type: 'string'
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with Tag object
var sql_get_all = require('../sql/tag/get_all.sql');

Tag.get_all = function (cb) {
  db.query(sql_get_all,[], function (err, res) {
    if (err)
      return cb(err);

    cb(null, res.rows);
  });
}

module.exports = function () {
};