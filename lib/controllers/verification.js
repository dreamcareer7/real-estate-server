/**
 * @namespace controller/verification
 */

/**
 * Creates a `Verification` object
 * @name createVerification
 * @memberof controller/verification
 * @instance
 * @function
 * @public
 * @summary POST /verification
 * @param {request} req - request object
 * @param {response} res - response object
 */
function createPhoneVerification(req, res) {
  var verificationObject = {
    phone_number: req.body.phone_number
  };

  PhoneVerification.create(verificationObject, function (err, verification_id) {
    if (err)
      return res.error(err);

    PhoneVerification.get(verification_id, function (err, verification) {
      if (err)
        return res.error(err);

      res.status(201);
      return res.model(verification);
    });
  });
}

/**
 * Validates a `Verification` object
 * @name verify
 * @memberof controller/verify
 * @instance
 * @function
 * @public
 * @summary GET /verification/:code
 * @param {request} req - request object
 * @param {response} res - response object
 */
function verifyPhone(req, res) {
  var user_id = req.user.id;
  if(!req.query.code)
    res.error(Error.Validation('Require a code parameter to verify this phone number'));

  var code = req.query.code;

  PhoneVerification.audit(user_id, code, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

var router = function (app) {
  var b = app.auth.bearer;

  app.post('/phone_verifications', b(createPhoneVerification));
  app.patch('/users/self/phone_verification', b(verifyPhone));
};

module.exports = router;
