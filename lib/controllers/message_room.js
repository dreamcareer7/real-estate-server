function createMessageRoom(req, res) {
  var message_room = req.body;

  MessageRoom.create(message_room, function(err, id) {
    if(err) {
      res.status(400);
      res.error(err);
      return;
    }

    MessageRoom.get(id, function(err, message_room) {
      if (err) {
        res.status(400);
        res.error(err);
        return;
      }

      res.status(201);
      res.model(message_room);
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
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.status(201);
    res.end();
  });
}

function getRooms(req, res) {
  var shortlist = req.params.sid;

  Shortlist.getRooms(shortlist, function(err, message_rooms) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.status(201);
    res.collection(message_rooms, 0 , message_rooms.length);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/message_rooms', b(createMessageRoom));
  app.post('/message_rooms/:mid/invite', b(inviteUsers));
  app.delete('/message_rooms/:mid/users/:id', b(leaveRoom));
  app.delete('/message_rooms/:mid', b(deleteRoom));
  app.get('/shortlists/:sid/message_rooms', b(getRooms));
}

module.exports = router;