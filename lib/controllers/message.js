function postMessage(req, res) {
  var room_id = req.params.id;
  var user_id = req.user.id;
  var message = req.body;

  Room.get(room_id, function(err, room) {
    if(err)
      return res.error(err);

    if(!Room.belongs(room.users, user_id))
      return res.error(Error.Forbidden('User is not a member of this room'));

    Message.post(room_id, message, true, function(err, message) {
      if(err)
        return res.error(err);

      res.status(200);
      res.model(message);
      return;
    });
  });
}

function retrieveMessages(req, res) {
  var user_id = req.user.id;
  var room_id = req.params.id;
  var paging = {};
  req.pagination(paging);

  Message.retrieve(room_id, paging, function(err, messages) {
    if(err)
      return res.error(err);

    res.collection(messages);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/rooms/:id/messages', b(postMessage));
  app.get('/rooms/:id/messages', b(retrieveMessages));
}

module.exports = router;