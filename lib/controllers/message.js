function recordMessage(req, res) {
  var message_room = req.params.id
  var message = req.body

  Message.record(message_room, message, function(err, message) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    if(!message) {
      res.status(401);
      res.end();
      return;
    }

    console.log(message);
    res.status(200);
    res.model(message);
    return;
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/message_rooms/:id/messages', recordMessage);
}

module.exports = router;