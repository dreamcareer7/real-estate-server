require('../utils/require_asc.js')

var goat = require('../asc/goat.asc');

function createSession(req, res) {
  if(req.body.device_uuid)
    req.body.device_id = req.body.device_uuid;
  
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

function presentGoat(req, res) {
  res.status(200);
  res.end(goat);
}

var router = function(app) {
  app.post('/sessions', app.auth.clientPassword(createSession));
  app.get('/sessions', presentGoat);
}

module.exports = router;