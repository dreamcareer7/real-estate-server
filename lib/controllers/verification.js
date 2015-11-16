/**
 * @namespace controller/verification
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
      res.send({
        code: 'OK',
        data: {
          type: 'verification',
          id: verification.id,
          user_id: verification.user_id,
          code: verification.code
        }
      })
    });
  });
}


function verify(req, res) {
  var user_id = req.params.id;
  var code = req.params.code;

  Verification.verify(code, user_id, function (err, result) {
    if (err)
      return res.error(err);

    res.send({
      code: 'OK',
      data: {
        status: 'verified'
      }
    })
  });
}

var router = function (app) {
  var b = app.auth.bearer;

  app.post('/verifications', b(createVerification));
  app.get('/verifications/:code/users/:id', b(verify));
}

module.exports = router;
