function createSession(req, res) {
  Session.create(req.body, function(err) {
    if(err)
      return res.error(err);

    Session.getState(req.body, function(err, state) {
      if(err)
        return res.error(err);

      res.status(201);
      res.json({
        code:'OK',
        data:state
      });
    });
  });
}


var router = function(app) {
  app.post('/sessions', app.auth.clientPassword(createSession));
}

module.exports = router;