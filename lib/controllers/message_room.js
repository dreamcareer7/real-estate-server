function createMessageRoom(req, res) {
  var message_room = req.body;

  MessageRoom.create(message_room, function(err, object) {
    if(err) {
      res.status(400);
      res.error(err);
      return;
    }


    res.status(201);
    console.log(object);
    res.model(object);
  });
}

function inviteUsers(req, res) {
  var shortlist = req.params.sid;
  var message_room = req.params.mid;
  var users = req.body.users;

  MessageRoom.addUsersToRoom(message_room, users, function(err, ok) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.status(201);
    res.end();
  });
}

function leaveRoom(req, res) {
  var shortlist = req.params.sid;
  var message_room = req.params.mid;
  var user = req.params.id;

  MessageRoom.deleteUserFromRoom(message_room, user, function(err, ok) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

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

function getShortlistRooms(req, res) {
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

function getUserRooms(req, res) {
  var user = req.params.id;

  User.getRooms(user, function(err, message_rooms) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.status(201);
    res.collection(message_rooms, 0 , message_rooms.length);
  });
}

function getUserRoomsOnShortlist(req, res) {
  var user = req.params.id;
  var shortlist = req.params.sid;
  var type = req.query.message_room_type || 'All';

  Shortlist.getUserRooms(user, shortlist, type, function(err, message_rooms) {
    if(err) {
      res.status(401);
      res.error(err);
      return;
    }

    res.status(201);
    res.collection(message_rooms, 0, message_rooms.length);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/message_rooms', b(createMessageRoom));
  app.post('/message_rooms/:mid/users', b(inviteUsers));
  app.delete('/message_rooms/:mid/users/:id', b(leaveRoom));
  app.delete('/message_rooms/:mid', b(deleteRoom));
  app.get('/shortlists/:sid/message_rooms', b(getShortlistRooms));
  app.get('/shortlists/:sid/users/:id/message_rooms', b(getUserRoomsOnShortlist));
  app.get('/users/:id/message_rooms', b(getUserRooms));
}

module.exports = router;