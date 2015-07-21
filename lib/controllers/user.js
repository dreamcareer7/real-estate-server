function createUser(req, res) {
  var user = req.body;
  user.type = 'user';

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

function updateUser(req, res) {
  User.get(req.params.id, function(err, user) {
    if(err)
      return res.error(err);

    if(!user) {
      res.status(404);
      res.end();
      return ;
    }

    var data = req.body;
    data.type = user.type;

    User.update(user.id, data, function(err) {
      if(err)
        return res.error(err);

      res.status(200);
      res.end();
    });
  });
}

function patchUser(req, res) {
  User.get(req.params.id, function(err, user) {
    if(err)
      return res.error(err);

    if(!user) {
      res.status(404);
      res.end();
      return ;
    }

    var data = user;
    for (var i in req.body)
      data[i] = req.body[i];

    User.patch(user.id, data, function(err) {
      if(err)
        return res.error(err);

      User.get(req.params.id, function(err, user) {
        if(err)
          return res.error(err);

        res.model(user);
      });
    });
  });
}

function changePassword(req, res) {
  var user_id = req.params.id;
  var old_password = req.body.old_password || ""
  var new_password = req.body.new_password || ""

  User.changePassword(user_id, old_password, new_password, function(err, user) {
    if(err)
      return res.error(err);

    res.status(200);
    res.end();
  });
}

function getUser(req, res) {
  User.get(req.params.id, function(err, user) {
    if(err)
      return res.error(err);

    if(!user) {
      res.status(404);
      res.end();
      return ;
    }

    res.model(user);
  });
}

function deleteUser(req, res) {
  User.get(req.params.id, function(err, user) {
    if(err)
      return res.error(err);

    if(!user) {
      res.status(404);
      res.end();
      return ;
    }

    User.delete(user.id, function(err) {
      if(err) {
        return res.error(err);
      }

      res.status(204);
      res.end();
    });
  });
}

function setAddress(req, res) {
  User.get(req.params.id, function(err, user) {
    if(err)
      return res.error(err);

    if(!user) {
      res.status(404);
      res.end();
      return ;
    }

    User.setAddress(user.id, req.body, function(err, addr_id) {
      if(err)
        return res.error(err);

      res.status(200);
      res.end();
    });
  });
}

function deleteAddress(req, res) {
  User.get(req.params.id, function(err, user) {
    if(err) {
      return res.error(err);
    }

    if(!user) {
      res.status(404);
      res.end();
      return ;
    }

    User.unsetAddress(user.id, function(err) {
      if(err) {
        return res.error(err);
      }

      res.status(204);
      res.end();
    });
  });
}

function getAddress(req, res) {
  User.getAddress(req.params.id, function(err, address) {
    if(err)
      return res.error(err);

    if(!address) {
      res.status(404);
      res.end();
      return ;
    }

    res.status(200);
    res.model(address);
  });
}

function getAvatar(req, res) {
  User.getAvatar(req.params.id, function(err, img) {
    if (err)
      return res.error(err);

    if (!img) {
      res.status(404);
      res.end();
      return;
    }

    res.status(200);
    res.model(img);
  });
}

function setAvatar(req, res) {
  var user = req.params.id;

  S3.parseSingleFormData(req, function(err, avatar) {
    if(err)
      return res.error(err);

    User.setAvatar(user, avatar, function(err, user) {
      if (err)
        return res.error(err);

      if (!user) {
        res.status(404);
        res.end();
        return;
      }

      res.status(200);
      res.model(user);
    });
  });
}

function setCover(req, res) {
  var user = req.params.id;

  S3.parseSingleFormData(req, function(err, cover) {
    if(err)
      return res.error(err);

    User.setCover(user, cover, function(err, user) {
      if (err)
        return res.error(err);

      if (!user) {
        res.status(404);
        res.end();
        return;
      }

      res.status(200);
      res.model(user);
    });
  });
}

function getCover(req, res) {
  User.getCover(req.params.id, function(err, img) {
    if (err)
      return res.error(err);

    if (!img) {
      res.status(404);
      res.end();
      return;
    }

    res.status(200);
    res.model(img);
  });
}

function getUserByEmail(req, res) {
  var email = req.query.email;

  User.getByEmail(email, function(err, user) {
    if(err)
      return res.error(err);

    if (!user) {
      res.status(404);
      res.end();
      return;
    }

    res.status(200);
    res.model(user);
  });
}

function InitiatePasswordReset(req, res) {
  var email = req.body.email;

  User.initiatePasswordReset(email, function(err, ok) {
    if(err)
      return res.error(err);

    res.status(200);
    res.end();
  });
}

function PasswordReset(req, res) {
  var email = req.body.email;
  var token = req.body.token;
  var password = req.body.password;

  User.resetPassword(email, token, password, function(err, ok) {
    if(err)
      return res.error(err);

    res.status(200);
    res.end();
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/users', app.auth.clientPassword(createUser));

  // Search for a User on Shortlisted by email
  app.get('/users/search', getUserByEmail);
  app.patch('/users/password', PasswordReset);
  app.post('/users/reset_password', InitiatePasswordReset);

  app.get('/users/:id', b(getUser));
  // app.put('/users/:id', b(updateUser));
  app.patch('/users/:id', b(patchUser));
  app.patch('/users/:id/password', b(changePassword));

  // app.delete('/users/:id', b(deleteUser));

  app.put('/users/:id/address', b(setAddress));
  app.get('/users/:id/address', b(getAddress));

  // S3 resources for cover and profile pictures
  app.get('/users/:id/avatar', b(getAvatar));
  app.post('/users/:id/avatar', b(setAvatar));
  app.get('/users/:id/cover', b(getCover));
  app.post('/users/:id/cover', b(setCover));

  app.delete('/users/:id/address', b(deleteAddress));
}

module.exports = router;