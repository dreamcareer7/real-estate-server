function recordMessage(req, res) {
  var message_room = req.params.id;
  var message = req.body;

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

    res.status(200);
    res.model(message);
    return;
  });
}

function retrieveMessages(req, res) {
  var message_room = req.params.id;
  var from = req.query.from || 0;
  var limit = req.query.limit || 20;
  var order = Boolean(parseInt(req.query.ascending));
  if (limit > 200)
    limit = 200;
  var offset = parseInt(req.query.offset) || 0;

  Message.retrieve(message_room, from, order, limit, offset, function(err, messages) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.collection(messages, offset, (messages[0]) ? messages[0].full_count : 0);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/message_rooms/:id/messages', recordMessage);
  app.get('/message_rooms/:id/messages', retrieveMessages);
}

module.exports = router;