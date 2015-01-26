function checkPassword(req, res) {
  var user = req.query.user
  var server = req.query.server
  var pass = req.query.pass

  XMPP.checkPassword(user, pass, function(err, ok) {
    if(err)
      return res.error(err);

    if(!ok) {
      res.status(401);
      res.end('false');
      return;
    }

    res.status(200);
    res.end('true');
    return;
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/check_password', checkPassword);
}

module.exports = router;