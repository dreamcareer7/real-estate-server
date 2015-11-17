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
function createVerification(req, res) {
  var verificationObject = {
    user_id: req.user.id,
    code: Math.floor((Math.random() * 90000) + 10000).toString()
  };

  Verification.create(verificationObject, function (err, id) {
    if (err)
      return res.error(err);

    Verification.get(id, function (err, verification) {
      if (err)
        return res.error(err);

      res.status(201);
      res.model(verification)
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
function verify(req, res) {
  var user_id = req.query.user_id;
  var code = req.params.code;

  Verification.verify(code, user_id, function (err, result) {
    if (err)
      return res.error(err);
    res.model(result)
  });
}

var router = function (app) {
  var b = app.auth.bearer;

  app.post('/verifications', b(createVerification));
  app.get('/verifications/:code', b(verify));
}

module.exports = router;
