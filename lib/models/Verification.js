/**
 * @namespace Verification
 */

var db        = require('../utils/db.js');
var validator = require('../utils/validator.js');
var sql       = require('../utils/require_sql.js');
var config    = require('../config.js');

Verification = {};

var schema = {
  type: 'object',
  properties: {
    user: {
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

var sql_insert                    = require('../sql/verification/insert.sql');
var sql_verify                    = require('../sql/verification/verify.sql');
var sql_get                       = require('../sql/verification/get.sql');
var verification_message_template = require('../asc/user/verification.asc');

/**
 * Inserts a `verification` object into database
 * @memberof Verification
 * @instance
 * @public
 * @param {Verification#verification} verification - full verification object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the `verification` object created
 */
Verification.create = function (verification, cb) {
  validate(verification, function (err) {
    if (err)
      return cb(err);

    db.query(sql_insert, [verification.code, verification.user], function (err, res) {
      if (err)
        return cb(err);

      // find user phone number to verify
      User.get(verification.user, function (err, user) {
        if (err)
          return cb(err);

        // send verification code
        Twilio.sendSMS({
          from: config.twilio.from,
          to: user.phone_number,
          body: verification_message_template,
          template_params: {
            first_name: user.first_name,
            code: verification.code
          }
        }, function (err, result) {
          if(err)
            return cb(err);

          return cb(null, res.rows[0].id);
        });
      });
    });
  });
};

/**
 * Validates a `Verification` object
 * @name verify
 * @function
 * @memberof Verification
 * @instance
 * @public
 * @param {uuid} user_id - ID of the verification owner
 * @param {code} code - verification code being verified
 * @param {callback} cb - callback function
 * @returns {Verification#verification}
 */
Verification.verify = function (code, user_id, cb) {
  db.query(sql_verify, [code, user_id], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.Forbidden('Code not found'));

    return cb(null, res.rows[0]);
  });
};

/**
 * Retrieves a full `Verification` object
 * @name get
 * @function
 * @memberof Verification
 * @instance
 * @public
 * @param {uuid} verification_id - ID of the verification being retrieved
 * @param {callback} cb - callback function
 * @returns {Verification#verification}
 */
Verification.get = function (verification_id, cb) {
  db.query(sql_get, [verification_id], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Code not found'));

    var verification = res.rows[0];
    return cb(null, verification);
  });
};

module.exports = function () {};
