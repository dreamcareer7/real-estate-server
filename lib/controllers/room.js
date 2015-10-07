function getRoom(req, res) {
  var room_id = req.params.id;

  Room.get(room_id, function(err, room) {
    if(err)
      return res.error(err);

    if(!room) {
      res.status(404);
      res.end();
      return ;
    }

    res.model(room);
  });
}

function createRoom(req, res) {
  var room = req.body;
  room.owner = req.user.id;

  Room.create(room, function(err, room) {
    if(err)
      return res.error(err);

    Room.get(room.id, function(err, room) {
      if(err)
        return res.error(err);

        res.status(201);
        res.model(room);
    });
  });
}

function updateRoom(req, res) {
  Room.get(req.params.id, function(err, room) {
    if(err)
      return res.error(err);

    if(!room) {
      res.status(404);
      res.end();
      return ;
    }

    var data = req.body;

    Room.update(room.id, data, function(err) {
      if(err)
        return res.error(err);

      res.status(200);
      res.end();
    });
  });
}

function patchRoom(req, res) {
  var room_id = req.params.id;
  var data = req.body;

  Room.patch(room_id, data, function(err, room) {
    if(err)
      return res.error(err);

    res.model(room);
  });
}

function deleteRoom(req, res) {
  var room_id = req.params.id;

  Room.delete(room_id, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    res.end();
  });
}

function getUserRooms(req, res) {
  var user_id = req.user.id;
  var paging = {};
  req.pagination(paging);

  Room.getUserRooms(user_id, paging, function(err, rooms) {
    if (err)
      return res.error(err);

    res.collection(rooms);
  });
}

function addUser(req, res) {
  var user_id = req.body.user_id;

  Room.addUser(user_id, req.params.id, function(err, room) {
    if (err)
      return res.error(err);

    Room.get(req.params.id, function(err, room) {
      if(err)
        return res.error(err);

      res.model(room);
    });
  });
}

function recommendManually(req, res) {
  var room_id = req.params.id;
  var listing_id = req.body.listing_id;

  var external_info = {};
  external_info.ref_object_id = req.body.ref_object_id;
  external_info.source = req.body.source;
  external_info.source_url = req.body.source_url;

  Room.recommendListing(room_id, listing_id, external_info, function(err, recs) {
    if(err)
      return res.error(err);

    res.collection(recs);
  });
}

function recommendManuallyByMLSNumber(req, res) {
  var room_id = req.params.id;
  var mls_number = req.body.mls_number;
  var external_info = {};

  external_info.ref_object_id = req.body.ref_object_id;
  external_info.source = req.body.source;
  external_info.source_url = req.body.source_url;
  external_info.restrict = true;

  Listing.getByMLSNumber(mls_number, function(err, listing) {
    if(err)
      return res.error(err);

    Room.recommendListing(room_id, listing.id, external_info, function(err, recs) {
      if(err)
        return res.error(err);

      res.collection(recs);
    });
  });
}

function leaveRoom(req, res) {
  var room_id = req.params.rid;
  var user_id = req.params.id;

  Room.get(room_id, function(err, room) {
    if(err)
      return res.error(err);

    User.get(user_id, function(err, user) {
      if(err)
        return res.error(err);

      Room.removeUserFromRoom(room_id, user_id, function(err, ok) {
        if(err)
          return res.error(err);

        res.status(204);
        res.end();
      });
    });
  });
}

function getRoomMedia(req, res) {
  var room = req.params.rid;
  var paging = {};
  req.pagination(paging);

  Room.getMedia(room, paging, function(err, medias) {
    if(err) {
      res.status(401);
      return res.error(err);
    }

    res.status(201);
    res.collection(medias);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  // Manually recommending a listing to a room
  // app.post('/rooms/:id/manual/mls', b(recommendManuallyByMLSNumber));
  // app.post('/rooms/:id/manual/id', b(recommendManually));

  // Getting all Rooms for a certain User
  app.get('/rooms', b(getUserRooms));
  // Adding a Room
  app.post('/rooms', b(createRoom));
  // Getting a Room
  app.get('/rooms/:id', b(getRoom));
  // Updating a Room
  app.put('/rooms/:id', b(updateRoom));
  // Patching a Room
  app.patch('/rooms/:id', b(patchRoom));
  // Deleting a Room
  app.delete('/rooms/:id', b(deleteRoom));
  // Adding a User to a Room
  app.post('/rooms/:id/users', b(addUser));
  // Leave a Room
  app.delete('/rooms/:rid/users/:id', b(leaveRoom));
  // Get Medias on a Room
  app.get('/rooms/:id/media', b(getRoomMedia));
}

module.exports = router;