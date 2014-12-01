function createEvent(req, res) {
  Event.create(req.body, function(err) {
    if(err)
      return res.error(err);

    res.status(201);
    res.end();
  });
}


var router = function(app) {
  app.post('/events', app.auth.bearer(createEvent));
}

module.exports = router;