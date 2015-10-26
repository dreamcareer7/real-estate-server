/**
 * @namespace controller/room
 */

var async = require('async');

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

    if(!room)
      return res.error(Error.ResourcNotFound());

    return res.model(room);
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

      return res.model(room);
    });
  });
}

/**
 * Updates a `Room` object using full parameters. This method performs validation on supplied object
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

      return res.model(room);
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

      return res.model(room);
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
      return res.end();
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

      return res.collection(rooms);
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
  var users = req.body.users || [];
  var room_id = req.params.id;

  if (!Array.isArray(users))
    return res.error(Error.Validation('Users property must be an array'));

  async.map(users, function(r, cb) {
    return Room.addUser(r, room_id, cb);
  }, function(err) {
    if(err)
      return res.error(err);

    Room.get(room_id, function(err, room) {
      if(err)
        return res.error(err);

      return res.model(room);
    });
  });
}

function search(req, res) {
  var user_id = req.user.id;
  var users = req.body.users || [];

  Room.search(user_id, users, function(err, rooms) {
    if(err)
      return res.error(err);

    return res.collection(rooms);
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

      Room.removeUser(room_id, user_id, function(err) {
        if(err)
          return res.error(err);

        res.status(204);
        return res.end();
      });
    });
  });
}

function recommendManually(req, res) {
  var room_id = req.params.id;
  var mls_number = req.body.mls_number;
  var external_info = {
    ref_user_id: req.user.id,
    source: req.body.source,
    source_url: req.body.source_url,
    notification: Boolean(req.body.notification) ? 'Share' : 'None'
  };

  Listing.getByMLSNumber(mls_number, function(err, listing) {
    if(err)
      return res.error(err);

    Room.recommendListing(room_id, listing.id, external_info, function(err, rec) {
      if(err)
        return res.error(err);

      return res.model(rec);
    });
  });
}

function getRoomMedia(req, res) {
  var room = req.params.id;
  var paging = {};
  req.pagination(paging);

  Room.getMedia(room, paging, function(err, medias) {
    if(err) {
      res.status(401);
      return res.error(err);
    }

    return res.collection(medias);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/rooms/search', b(search));
  app.post('/rooms/:id/recs', b(recommendManually));
  app.get('/rooms/:id/media', b(getRoomMedia));
  app.get('/rooms/:id', b(getRoom));
  app.get('/rooms', b(getUserRooms));
  app.post('/rooms/:id/users', b(addUser));
  app.post('/rooms', b(createRoom));
  app.put('/rooms/:id', b(updateRoom));
  app.patch('/rooms/:id', b(patchRoom));
  app.delete('/rooms/:rid/users/:id', b(removeUser));
  app.delete('/rooms/:id', b(deleteRoom));
};

module.exports = router;
