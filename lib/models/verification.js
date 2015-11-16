var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var sql = require('../utils/require_sql.js');
var config = require('../config.js');

Verification = {};

var schema = {
  type: 'object',
  properties: {
    user_id: {
      required: true,
      type: 'string',
      uuid: true
    },

    code: {
      required: true,
      type: 'string'
    }
  }
};

var validate = validator.bind(null, schema);

var sql_insert = require('../sql/verification/insert.sql');
var sql_verify = require('../sql/verification/verify.sql');
var sql_get = require('../sql/verification/get.sql');

Verification.create = function (verification, cb) {
  validate(verification, function (err) {
    if (err)
      return cb(err);

    db.query(sql_insert, [verification.code, verification.user_id], function (err, res) {
      if (err)
        return cb(err);

      //send verification code
      Twilio.sendSMS({
        from: config.twilio.from,
        to: '00989124840463',
        body: 'test'
      }, function (err, result) {

        if (err)
          return cb(err)

        return cb(null, res.rows[0].id);
      })
    });
  });
}


Verification.verify = function (code, user_id, cb) {
  db.query(sql_verify, [code, user_id], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.Forbidden('Code not found'));

    return cb(null, true);
  });
}


Verification.get = function (id, cb) {
  db.query(sql_get, [id], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Code not found'));

    var verification = res.rows[0];
    return cb(null, verification);
  });
}

module.exports = function () {
};