/**
 * @namespace controller/verification
 */

var async     = require('async');
var validator = require('../utils/validator.js');

var email_verification = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      format: 'email',
      required: true
    },
    email_code: {
      type: 'string',
      required: true
    },
    agent: {
      type: 'string',
      uuid: true,
      required: false
    },
    token: {
      type: 'string',
      required: false
    }
  }
};

/**
 * Creates a `PhoneVerification` object
 * @name createPhoneVerification
 * @memberof controller/verification
 * @instance
 * @function
 * @public
 * @summary POST /phone_verifications
 * @param {request} req - request object
 * @param {response} res - response object
 */
function createPhoneVerification(req, res) {
  var user_id = req.user.id;

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    var verificationObject = {
      phone_number: user.phone_number
    };

    PhoneVerification.create(verificationObject, true, function (err, verification_id) {
      if (err)
        return res.error(err);

      PhoneVerification.get(verification_id, function (err) {
        if (err)
          return res.error(err);

        res.status(204);
        return res.end();
      });
    });
  });
}

/**
 * Creates a `EmailVerification` object
 * @name createEmailVerification
 * @memberof controller/verification
 * @instance
 * @function
 * @public
 * @summary POST /email_verifications
 * @param {request} req - request object
 * @param {response} res - response object
 */
function createEmailVerification(req, res) {
  var user_id = req.user.id;

  User.get(user_id, (err, user) => {
    if(err)
      return res.error(err);

    var verificationObject = {
      email: user.email
    };

    EmailVerification.create(verificationObject, true, (err, verification_id) => {
      if(err)
        return res.error(err);

      EmailVerification.get(verification_id, err => {
        if(err)
          return res.error(err);

        res.status(204);
        return res.end();
      });
    });
  });
}

/**
 * Validates a `EmailVerification` object
 * @name verifyEmail
 * @memberof controller/verify
 * @instance
 * @function
 * @public
 * @summary PATCH /users/self/email_verification
 * @param {request} req - request object
 * @param {response} res - response object
 */
function verifyEmail(req, res) {
  var user_id = req.user.id;
  var email = req.user.email;
  var code = req.body.code;
  var token = req.body.token;
  var agent = req.body.agent;

  if(!code)
    res.error(Error.Validation('Require a code parameter to verify this email'));

  async.auto({
    upgrade: cb => {
      if(!token || !agent)
        return cb();

      User.upgradeToAgentWithToken(user_id, token, agent, cb);
    },
    audit: cb => {
      EmailVerification.audit(email, code, cb);
    },
    get: [
      'upgrade' ,
      'audit',
      cb => {
        User.get(user_id, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return res.error(err);

    return res.model(results.get);
  });
}

function verifyEmailSA(req, res) {
  validator(email_verification, req.body, err => {
    if(err)
      return res.error(err);

    var email = req.body.email;
    var email_code = req.body.email_code;
    var token = req.body.token;
    var agent = req.body.agent;

    var upgrade = token && agent;

    console.log(req.body);
    async.auto({
      user: cb => {
        if(!upgrade)
          return cb();

        User.getByEmail(email, cb);
      },
      upgrade: [
        'user',
        (cb, results) => {
          if(!upgrade)
            return cb();

          User.upgradeToAgentWithToken(results.user.id, token, agent, cb);
        }
      ],
      audit: cb => {
        EmailVerification.audit(email, email_code, cb);
      },
      get: [
        'user',
        'upgrade',
        'audit',
        (cb, results) => {
          return User.getByEmail(email, cb);
        }
      ]
    }, (err, results) => {
      if(err)
        return res.error(err);

      return res.model(results.get);
    });
  });
}

/**
 * Validates a `PhoneVerification` object
 * @name verifyPhone
 * @memberof controller/verify
 * @instance
 * @function
 * @public
 * @summary PATCH /users/self/phone_verification
 * @param {request} req - request object
 * @param {response} res - response object
 */
function verifyPhone(req, res) {
  var user_id = req.user.id;
  var phone_number = req.user.phone_number;
  var code = req.body.code;

  if(!code)
    res.error(Error.Validation('Require a code parameter to verify this phone number'));

  PhoneVerification.audit(phone_number, code, function(err) {
    if(err)
      return res.error(err);

    User.get(user_id, function(err, user) {
      if(err)
        return res.error(err);

      return res.model(user);
    });
  });
}

function verifyPhoneSA(req, res) {
  if (!req.body.phone_number)
    return res.error(Error.Validation('You must provide a phone number to verify'));

  if (!req.body.code)
    return res.error(Error.Validation('You must provide a code to verify your phone number'));

  var phone_number = req.body.phone_number;
  var code = req.body.code;

  PhoneVerification.audit(phone_number, code, function(err) {
    if(err)
      return res.error(err);

    res.status(200);
    return res.end();
  });
}

var router = function (app) {
  var b = app.auth.bearer;

  // app.post('/phone_verifications', b(createPhoneVerification));
  // app.post('/email_verifications', b(createEmailVerification));
  // app.patch('/users/self/phone_confirmed', b(verifyPhone));
  // app.patch('/users/self/email_confirmed', b(verifyEmail));
  app.patch('/users/phone_confirmed', verifyPhoneSA);
  app.patch('/users/email_confirmed', verifyEmailSA);
};

module.exports = router;
