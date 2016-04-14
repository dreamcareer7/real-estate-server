var db          = require('../utils/db.js');
var validator   = require('../utils/validator.js');
var sql         = require('../utils/require_sql.js');

var sql_get_all = require('../sql/tag/get_all.sql');

Tag = {};

var schema = {
  type: 'object',
  properties: {
    name: {
      required: true,
      type: 'string'
    }
  }
};

var validate = validator.bind(null, schema);


Tag.getAll = function (cb) {
  if(!process.domain.user)
    return cb(null, []);

  db.query(sql_get_all, [process.domain.user.id], (err, res) =>{
    if(err)
      return cb(err);

    return cb(null, res.rows);
  });
};

module.exports = function () {

};
