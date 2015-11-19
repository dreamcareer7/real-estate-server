/**
 * @namespace Verification
 */

var async     = require('async');
var db        = require('../utils/db.js');
var validator = require('../utils/validator.js');
var sql       = require('../utils/require_sql.js');
var config    = require('../config.js');

PhoneVerification = {};
EmailVerification = {};

var schema_phone = {
  type: 'object',
  properties: {
    phone_number: {
      required: true,
      type: 'string'
    }
  }
};

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
PhoneVerification.create = function (verification, cb) {
  verification.code = Math.floor((Math.random() * 90000) + 10000).toString();

  validator(schema_phone, verification, function (err) {
    if (err)
      return cb(err);

    db.query(sql_insert, [verification.code, verification.phone_number], function (err, res) {
      if (err)
        return cb(err);

      Twilio.sendSMS({
        from: config.twilio.from,
        to: verification.phone_number,
        body: verification_message_template,
        template_params: {
          code: verification.code
        }
      }, function (err, result) {
        if(err)
          return cb(err);

        return cb(null, res.rows[0].id);
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
PhoneVerification.audit = function (user_id, code, cb) {
  async.auto({
    user: function(cb) {
      return User.get(user_id, cb);
    },
    verify: ['user',
             function(cb, results) {
               if(!results.user.phone_number)
                 return cb(Error.Forbidden('No phone numbers are registered for this user'));

               db.query(sql_verify, [code, results.user.phone_number], function (err, res) {
                 if (err)
                   return cb(err);

                 if (res.rowCount < 1)
                   return cb(Error.Forbidden('Invalid code'));

                 return cb();
               });
             }]
  }, function(err, results) {
    if(err)
      return cb(err);

    return cb(null);
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
PhoneVerification.get = function (verification_id, cb) {
  db.query(sql_get, [verification_id], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Code not found'));

    var verification = res.rows[0];
    return cb(null, verification);
  });
};

PhoneVerification.publicize = function(model) {
  if(model.code) delete model.code;

  return model;
};

module.exports = function () {};
