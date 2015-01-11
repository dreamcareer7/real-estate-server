var crypto = require('crypto');
var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var sql = require('../utils/require_sql.js');

Token = {};

var schema = {
  type:'object',
  properties: {
    client_id: {
      required:true,
      type:'string',
      uuid:true
    },

    user_id: {
      required:true,
      type:'string',
      uuid:true,
      type:'string'
    },

    type: {
      required:true,
      type:'string',
    },

    expire_date: {
      type:'number'
    }
  }
}

var validate = validator.bind(null, schema);

var sql_insert = require('../sql/token/insert.sql');
var sql_delete = require('../sql/token/delete.sql');
var sql_get = require('../sql/token/get.sql');

Token.create = function(options, cb) {
  validate(options, function(err) {
    if(err)
      return cb(err);

    var token = JSON.parse(JSON.stringify(options));
    token.token = crypto.randomBytes(32).toString('base64');

    db.query(sql_insert, [
      token.token,
      token.client_id,
      token.user_id,
      token.type,
      token.expire_date
    ], function(err) {
      if(err)
        return cb(err);

      cb(null, token);
    });
  });
}

Token.removePrevious = function(user_id, client_id, cb) {
  db.query(sql_delete, [
    user_id,
    client_id
  ], cb);
};

Token.get = function(token, cb) {
  db.query(sql_get, [token], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, false);

    cb(null, res.rows[0]);
  });
}

module.exports = function(){};