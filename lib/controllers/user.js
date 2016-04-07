/**
 * @namespace controller/user
 */

/**
 * Creates a `User` object
 * @name createUser
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary POST /users
 * @param {request} req - request object
 * @param {response} res - response object
 */
function createUser(req, res) {
  var user = req.body;

  User.create(user, function(err, id) {
    if(err)
      return res.error(err);

    User.get(id, function(err, user) {
      if(err)
        return res.error(err);

      res.status(201);
      res.model(user);
    });
  });
}

/**
 * Retrieves a `User` object
 * @name getUser
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary GET /users/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function getUser(req, res) {
  var user_id = req.params.id;

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    res.model(user);
  });
}

/**
 * Updates a `User` object using full parameters. This method performs validation on supplied object
 * @name updateUser
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary PUT /users/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function updateUser(req, res) {
  var user_id = req.user.id;

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    var data = req.body;
    data.type = user.type;

    User.update(user_id, data, function(err) {
      if(err)
        return res.error(err);

      res.status(200);
      res.end();
    });
  });
}

/**
 * Patches a `User` object using partial parameters
 * @name patchUser
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary PATCH /users/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function patchUser(req, res) {
  var user_id = req.user.id;

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    var data = user;
    for (var i in req.body)
      data[i] = req.body[i];

    // Amanda considers null !== undefined
    // That means while phone_number is optional, providing is as null would throw an error
    // Next two lines mean phone_number could be dupplied as null and would be treated as undefined
    if(data.phone_number === null)
      delete data.phone_number;

    User.patch(user_id, data, function(err) {
      if(err)
        return res.error(err);

      User.get(user_id, function(err, user) {
        if(err)
          return res.error(err);

        res.model(user);
      });
    });
  });
}

/**
 * Deletes a `User` object
 * @name deleteUser
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary DELETE /users/:id
 * @param {request} req - request object
 * @param {response} res - response object
 */
function deleteUser(req, res) {
  var user_id = req.user.id;

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    User.delete(user_id, function(err) {
      if(err) {
        return res.error(err);
      }

      res.status(204);
      res.end();
    });
  });
}

/**
 * Changes `User` password
 * @name changePassword
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary PATCH /users/:id/password
 * @param {request} req - request object
 * @param {response} res - response object
 */
function changePassword(req, res) {
  var user_id = req.user.id;
  var old_password = req.body.old_password || "";
  var new_password = req.body.new_password || "";

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    User.changePassword(user_id, old_password, new_password, function(err, user) {
      if(err)
        return res.error(err);

      res.status(200);
      res.end();
    });
  });
}

/**
 * Sets an `Address` for a `User`
 * @name setAddress
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary PATCH /users/:id/address
 * @param {request} req - request object
 * @param {response} res - response object
 */
function setAddress(req, res) {
  var user_id = req.user.id;
  var address = req.body;

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    User.setAddress(user_id, address, function(err, address_id) {
      if(err)
        return res.error(err);

      User.get(user_id, function(err, user) {
        if(err)
          return res.error(err);

        res.status(200);
        res.model(user);
      });
    });
  });
}

/**
 * Unsets the `Address` for a `User`
 * @name deleteAddress
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary DELETE /users/:id/address
 * @param {request} req - request object
 * @param {response} res - response object
 */
function deleteAddress(req, res) {
  var user_id = req.user.id;

  User.get(user_id, function(err, user) {
    if(err)
      return res.error(err);

    User.unsetAddress(user_id, function(err) {
      if(err)
        return res.error(err);

      User.get(user_id, function(err, user) {
        res.status(200);
        res.model(user);
      });
    });
  });
}

/**
 * Searches for a `User` based on user code or email
 * @name search
 * @memberof controller/user
 * @instance
 * @function
 * @public
 * @summary GET /users/search
 * @param {request} req - request object
 * @param {response} res - response object
 */
function search(req, res) {
  var user_id = req.user.id;

  if (req.query.email) {
    var emails = ObjectUtil.queryStringArray(req.query.email);

    User.bulkSearchByFamily('email', emails, function(err, users) {
      if(err)
        return res.error(err);

      return res.collection(users);
    });
  } else if (req.query.code) {
    var code = req.query.code;

    User.getByCode(code, function(err, user) {
      if(err)
        return res.error(err);

      res.status(200);
      return res.model(user);
    });
  } else if (req.query.phone) {
    var phones = ObjectUtil.queryStringArray(req.query.phone);

    User.bulkSearchByFamily('phone', phones, function(err, users) {
      if(err)
        return res.error(err);

      return res.collection(users);
    });
  } else {
    return res.error(Error.Validation('Malformed search query'));
  }
}

function searchRelated(req, res) {
  var user_id = req.user.id;
  var terms = ObjectUtil.queryStringArray(req.query.q);

  User.stringSearch(user_id, terms, function(err, users) {
    if(err)
      return res.error(err);

    return res.collection(users);
  });
}

function InitiatePasswordReset(req, res) {
  var email = req.body.email;

  User.initiatePasswordReset(email, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function passwordReset(req, res) {
  var email = req.body.email;
  var token = req.body.token;
  var password = req.body.password;

  User.resetPassword(email, token, password, function(err) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function patchUserTimeZone(req, res) {
  var user_id = req.user.id;
  var timezone = req.body.time_zone;

  User.patchTimeZone(user_id, timezone, function(err, ok) {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

function patchUserAvatars(req, res, type, link) {
  var user_id = req.user.id;

  User.patchAvatars(user_id, type, link, function(err) {
    if(err)
      return res.error(err);

    User.get(user_id, function(err, user) {
      if(err)
        return res.error(err);

      return res.model(user);
    });
  });
}

function patchUserProfileImage(req, res) {
  return patchUserAvatars(req, res, 'Profile', req.body.profile_image_url);
}

function patchUserCoverImage(req, res) {
  return patchUserAvatars(req, res, 'Cover', req.body.cover_image_url);
}

var router = function(app) {
  var b = app.auth.bearer;

  app.patch('/users/self/profile_image_url', b(patchUserProfileImage));
  app.patch('/users/self/cover_image_url', b(patchUserCoverImage));
  app.patch('/users/self/timezone', b(patchUserTimeZone));
  app.post('/users', app.auth.clientPassword(createUser));
  app.get('/users/related/search', b(searchRelated));
  app.get('/users/search', b(search));
  app.patch('/users/password', passwordReset);
  app.post('/users/reset_password', InitiatePasswordReset);
  app.get('/users/:id', getUser);
  app.put('/users/self', b(patchUser));
  app.patch('/users/self/password', b(changePassword));
  app.delete('/users/self', b(deleteUser));
  app.put('/users/self/address', b(setAddress));
  app.delete('/users/self/address', b(deleteAddress));
};

module.exports = router;
