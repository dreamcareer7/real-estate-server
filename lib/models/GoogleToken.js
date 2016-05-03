var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var sql_insert = require('../sql/google_token/insert.sql');
var sql_update = require('../sql/google_token/update.sql');
var sql_get = require('../sql/google_token/get.sql');

GoogleToken = {};

var schema = {
  type: 'object',
  properties: {
    user: {
      type: 'string',
      required: true
    },

    access_token: {
      type: 'string',
      required: true
    },

    refresh_token: {
      type: 'string',
      required: true
    },

    expiry_date: {
      type: 'string',
      required: true
    },
  }
};

var validate = validator.bind(null, schema);

GoogleToken.create = function (google_token, cb) {
  validate(google_token, function (err) {
    if(err)
      return cb(err);

    db.query(sql_insert, [
      google_token.user,
      google_token.access_token,
      google_token.refresh_token,
      google_token.expiry_date
    ], cb);
  });
};

GoogleToken.update = function (id, google_token, cb) {
  db.query(sql_update, [
    google_token.access_token,
    google_token.refresh_token,
    google_token.expiry_date,
    id
  ], cb);
};

GoogleToken.getByUser = function (user_id, cb) {
  db.query(sql_get, [user_id], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Token not found.'));

    return cb(null, res.rows[0]);
  });
};

module.exports = function () {
};