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
  var room_id = req.params.id;
  var user_id = req.params.uid;
  var paging = {};
  req.pagination(paging);

  Message.retrieve(room_id, user_id, paging, function(err, messages) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.collection(messages);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/message_rooms/:id/messages', b(recordMessage));
  app.get('/message_rooms/:id/users/:uid/messages', b(retrieveMessages));
}

module.exports = router;