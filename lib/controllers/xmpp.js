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

function userExists(req, res) {
  var user = req.query.user
  var server = req.query.server
  var pass = req.query.pass

  XMPP.userExists(user, function(err, ok) {
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

function getPassword(req, res) {
  var user = req.query.user
  var server = req.query.server
  var pass = req.query.pass

  XMPP.getPassword(user, function(err, password) {
    if(err)
      return res.error(err);

    if(!password) {
      res.status(401);
      res.end();
      return;
    }

    res.status(200);
    res.end(password);
    return;
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/check_password', checkPassword);
  app.get('/user_exists', userExists);
}

module.exports = router;