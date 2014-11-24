var crypto = require('crypto');
var db = require('../utils/db.js');
var validator = require('../utils/validator.js');

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

var insert_sql = 'INSERT INTO tokens (token, client_id, user_id, type, expire_date) VALUES ($1,$2,$3,$4,to_timestamp($5))';

Token.create = function(options, cb) {
  validate(options, function(err) {
    if(err)
      return cb(err);

    var token = JSON.parse(JSON.stringify(options));
    token.token = crypto.randomBytes(32).toString('base64');

    db.query(insert_sql, [
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

var delete_sql = 'DELETE FROM tokens WHERE user_id = $1 AND client_id = $2';
Token.removePrevious = function(user_id, client_id, cb) {
  db.query(delete_sql, [
    user_id,
    client_id
  ], cb);
};

var get_sql = 'SELECT * FROM tokens WHERE token = $1';
Token.get = function(token, cb) {
  db.query(get_sql, [token], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, false);

    cb(null, res.rows[0]);
  });
}

module.exports = function(){};