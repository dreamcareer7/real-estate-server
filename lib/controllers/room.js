/**
 * @namespace controller/room
 */

/**
 * Retreives a `Room` object
 * @name getRoom
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary GET /rooms/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
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

/**
 * Creates a `Room` object
 * @name createRoom
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary POST /rooms
 * @param {request} req - request object
 * @param {response} res - response object
 */
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

/**
 * Updates a `Room` object using full parameters
 * This method valides room object
 * @name updateRoom
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary PUT /rooms/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function updateRoom(req, res) {
  var room_id = req.params.id;
  var data = req.body;

  Room.get(req.params.id, function(err, room) {
    if(err)
      return res.error(err);

    Room.update(room.id, data, function(err, room) {
      if(err)
        return res.error(err);

      res.model(room);
    });
  });
}

/**
 * Patches a `Room` object using partial parameters
 * @name patchRoom
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary PATCH /rooms/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function patchRoom(req, res) {
  var room_id = req.params.id;
  var data = req.body;

  Room.get(room_id, function(err, room) {
    if(err)
      return res.error(err);

    Room.patch(room_id, data, function(err, room) {
      if(err)
        return res.error(err);

      res.model(room);
    });
  });
}

/**
 * Deletes a `Room` object
 * @name deleteRoom
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary DELETE /rooms/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function deleteRoom(req, res) {
  var room_id = req.params.id;

  Room.get(room_id, function(err, room) {
    if(err)
      return res.error(err);

    Room.delete(room_id, function(err) {
      if(err)
        return res.error(err);

      res.status(204);
      res.end();
    });
  });
}

/**
 * Retrieves all `Room` objects the specified user is a member of
 * @name getUserRooms
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary GET /rooms
 * @param {request} req - request object
 * @param {response} res - response object
 */
function getUserRooms(req, res) {
  var user_id = req.user.id;
  var paging = {};
  req.pagination(paging);

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    Room.getUserRooms(user_id, paging, function(err, rooms) {
      if (err)
        return res.error(err);

      res.collection(rooms);
    });
  });
}

/**
 * Adds a `User` to a `Room`
 * @name addUser
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary POST /rooms/:id/users
 * @param {request} req - request object
 * @param {response} res - response object
 */
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

/**
 * Removes a `User` from a `Room`
 * @name removeUser
 * @memberof controller/room
 * @instance
 * @function
 * @public
 * @summary DELETE /rooms/:id/users/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function removeUser(req, res) {
  var room_id = req.params.rid;
  var user_id = req.params.id;

  Room.get(room_id, function(err, room) {
    if(err)
      return res.error(err);

    User.get(user_id, function(err, user) {
      if(err)
        return res.error(err);

      Room.removeUser(room_id, user_id, function(err, ok) {
        if(err)
          return res.error(err);

        res.status(204);
        res.end();
      });
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

  // app.post('/rooms/:id/manual/mls', b(recommendManuallyByMLSNumber));
  // app.post('/rooms/:id/manual/id', b(recommendManually));

  app.get('/rooms', b(getUserRooms));
  app.post('/rooms', b(createRoom));
  app.get('/rooms/:id', b(getRoom));
  app.put('/rooms/:id', b(updateRoom));
  app.patch('/rooms/:id', b(patchRoom));
  app.delete('/rooms/:id', b(deleteRoom));
  app.post('/rooms/:id/users', b(addUser));
  app.delete('/rooms/:rid/users/:id', b(removeUser));
  app.get('/rooms/:id/media', b(getRoomMedia));
}

module.exports = router;