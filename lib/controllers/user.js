/**
 * @namespace controller/user
 */

var async     = require('async');
var validator = require('../utils/validator.js');

var upgrade_schema = {
  type: 'object',
  properties: {
    agent: {
      type: 'string',
      uuid: true,
      required: true
    },
    secret: {
      type: 'string',
      required: true
    }
  }
};

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

  if(!user.email)
    return res.error(Error.Validation('Email field is mandatory'));

  User.getByEmail(user.email, (err, current) => {
    if(err)
      return res.error(err);

    if(!current) {
      User.create(user, function(err, id) {
        if(err)
          return res.error(err);

        User.get(id, function(err, user) {
          if(err)
            return res.error(err);

          res.status(201);
          return res.model(user);
        });
      });
    } else if (current.is_shadow) {
      async.auto({
        agent: cb => {
          if(!user.actions)
            return cb(null, []);

          async.map(user.actions, (r, cb) => {
            if(r.agent)
              return cb(null, r.agent);

            return cb();
          }, (err, results) => {
            if(err)
              return cb(err);

            return cb(null, results[0] || null);
          });
        },
        send_activation: [
          'agent',
          (cb, results) => {
            var context = false;

            if(results.agent) {
              context = {
                agent: results.agent
              };
            }

            return User.sendActivation(current.id, context, cb);
          }
        ]
      }, (err, results) => {
        if(err)
          return res.error(err);

        res.status(202);
        return res.json(
          {
            data: {
              type: 'user_reference',
              id: current.id,
              created_at: current.created_at,
              updated_at: current.updated_at,
              email_confirmed: current.email_confirmed
            },
            code: 'OK'
          }
        );
      });
    } else {
      return res.error(Error.Conflict({
        details: {
          attributes: {
            email: 'Provided email already exists'
          }
        }
      }));
    }
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

function getSelf(req, res) {
  res.model(req.user);
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
  var shadow_token = req.body.shadow_token;
  var password = req.body.password;
  var agent = req.body.agent;

  var upgrade = agent && shadow_token;

  if(token) {
    User.resetPassword(email, token, password, err => {
      if(err)
        return res.error(err);

      res.status(204);
      return res.end();
    });
  } else if(shadow_token) {
    async.auto({
      user: cb => {
        return User.getByEmail(email, cb);
      },
      reset_password: cb => {
        return User.resetPasswordByShadowToken(email, shadow_token, password, cb);
      },
      upgrade: [
        'user',
        'reset_password',
        (cb, results) => {
          if(!upgrade)
            return cb();

          return User.upgradeToAgentWithToken(results.user.id, shadow_token, agent, cb);
        }
      ]
    }, (err, results) => {
      if(err)
        return res.error(err);

      res.status(204);
      return res.end();
    });
  } else {
    return res.error(Error.Validation('Password reset is done either by a reset token or a shadow token'));
  }
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

function upgrade(req, res) {
  var user_id = req.user.id;
  var agent_id = req.body.agent;
  var secret = req.body.secret;

  async.auto({
    validate: cb => {
      return validator(upgrade_schema, req.body, cb);
    },
    audit: [
      'validate',
      cb => {
        Agent.auditSecret(agent_id, secret, cb);
      }
    ],
    upgrade: [
      'validate',
      'audit',
      cb => {
        User.upgradeToAgent(user_id, agent_id, cb);
      }
    ],
    user: [
      'validate',
      'audit',
      'upgrade',
      cb => {
        User.get(user_id, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return res.error(err);

    return res.model(results.user);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.patch('/users/self/profile_image_url', b(patchUserProfileImage));
  app.patch('/users/self/cover_image_url', b(patchUserCoverImage));
  app.patch('/users/self/timezone', b(patchUserTimeZone));
  app.patch('/users/self/upgrade', b(upgrade));
  app.post('/users', app.auth.clientPassword(createUser));
  app.get('/users/related/search', b(searchRelated));
  app.get('/users/search', b(search));
  app.patch('/users/password', passwordReset);
  app.post('/users/reset_password', InitiatePasswordReset);
  app.get('/users/self', b(getSelf));;
  app.get('/users/:id', app.auth.optionalBearer(getUser));
  app.put('/users/self', b(patchUser));
  app.patch('/users/self/password', b(changePassword));
  app.delete('/users/self', b(deleteUser));
  app.put('/users/self/address', b(setAddress));
  app.delete('/users/self/address', b(deleteAddress));
};

module.exports = router;
