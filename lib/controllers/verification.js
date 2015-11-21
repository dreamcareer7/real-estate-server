/**
 * @namespace controller/verification
 */

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
  var code = req.body.code;

  if(!code)
    res.error(Error.Validation('Require a code parameter to verify this phone number'));


  PhoneVerification.audit(user_id, code, function(err) {
    if(err)
      return res.error(err);

    User.get(user_id, function(err, user) {
      if(err)
        return res.error(err);

      return res.model(user);
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

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    var verificationObject = {
      email: user.email
    };

    EmailVerification.create(verificationObject, true, function (err, verification_id) {
      if (err)
        return res.error(err);

      EmailVerification.get(verification_id, function (err) {
        if (err)
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
  var code = req.body.code;

  if(!code)
    res.error(Error.Validation('Require a code parameter to verify this email'));

  EmailVerification.audit(user_id, code, function(err) {
    if(err)
      return res.error(err);

    User.get(user_id, function(err, user) {
      if(err)
        return res.error(err);

      return res.model(user);
    });
  });
}

var router = function (app) {
  var b = app.auth.bearer;

  app.post('/phone_verifications', b(createPhoneVerification));
  app.post('/email_verifications', b(createEmailVerification));
  app.patch('/users/self/phone_confirmed', b(verifyPhone));
  app.patch('/users/self/email_confirmed', b(verifyEmail));
};

module.exports = router;
