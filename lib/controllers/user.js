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
  var email = req.body.email
  console.log('email:',email)
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

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/users', app.auth.clientPassword(createUser));

  app.get('/users/:id', b(getUser));
  app.put('/users/:id', b(updateUser));
  app.delete('/users/:id', b(deleteUser));

  app.put('/users/:id/address', b(setAddress));
  app.get('/users/:id/address', b(getAddress));

  // Mock resources for cover and profile pictures
  app.get('/users/:id/avatar', b(getAvatar));
  app.get('/users/:id/cover', b(getCover));

  app.delete('/users/:id/address', b(deleteAddress));

  // Search for a User on Shortlisted by email
  app.post('/users/search/email', b(getUserByEmail));
}

module.exports = router;