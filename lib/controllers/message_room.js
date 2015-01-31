function createMessageRoom(req, res) {
  var shortlist = req.params.sid;
  var owner = req.body.owner_id;
  var type = req.body.type;
  var users = req.body.users;

  MessageRoom.create(shortlist, type, owner, users, function(err, id) {
    if(err)
      res.error(err);
    MessageRoom.get(id, function(err, room) {
      if (err)
        return res.error(err);

      res.status(201);
      res.model(room);
    });
  });
}

function inviteUsers(req, res) {
  var shortlist = req.params.sid;
  var message_room = req.params.mid;
  var users = req.body.users;

  MessageRoom.addUsersToRoom(message_room, users, function(err, ok) {
    if(err)
      res.error(err);

    res.status(201);
    res.end();
  });
}

function leaveRoom(req, res) {
  var shortlist = req.params.sid;
  var message_room = req.params.mid;
  var user = req.params.id;

  MessageRoom.deleteUserFromRoom(message_room, user, function(err, ok) {
    if(err)
      res.error(err);

    res.status(201);
    res.end();
  });
}

function deleteRoom(req, res) {
  var shortlist = req.params.sid;
  var message_room = req.params.mid;

  MessageRoom.delete(message_room, function(err, ok) {
    if(err)
      res.error(err);

    res.status(201);
    res.end();
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/shortlists/:sid/message_rooms', b(createMessageRoom));
  app.post('/shortlists/:sid/message_rooms/:mid/invite', b(inviteUsers));
  app.delete('/shortlists/:sid/users/:id/message_rooms/:mid', b(leaveRoom));
  app.delete('/shortlists/:sid/message_rooms/:mid', b(deleteRoom));
}

module.exports = router;