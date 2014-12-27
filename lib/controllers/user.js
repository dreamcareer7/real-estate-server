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
      if(err)
        return res.error(err);

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
    if(err)
      return res.error(err);

    if(!user) {
      res.status(404);
      res.end();
      return ;
    }

    User.unsetAddress(user.id, function(err) {
      if(err)
        return res.error(err);

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
      return res.status(404);
      res.end();
      return ;
    }

    res.status(200);
    res.model(address);
  });
}

function getProfilePicture(req, res) {
  User.getProfilePicture(req.params.id, function(err, img) {
    if (err)
      return res.error(err);

    if (!img) {
      return res.status(404);
      res.end();
      return;
    }

    res.status(200);
    res.model(img);
  });
}

function getCoverPicture(req, res) {
  User.getCoverPicture(req.params.id, function(err, img) {
    if (err)
      return res.error(err);

    if (!img) {
      return res.status(404);
      res.end();
      return;
    }

    res.status(200);
    res.model(img);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/users', app.auth.clientPassword(createUser));

  app.get('/user/:id', b(getUser));
  app.put('/user/:id', b(updateUser));
  app.delete('/user/:id', b(deleteUser));

  app.put('/user/:id/address', b(setAddress));
  app.get('/user/:id/address', b(getAddress));

  // Mock resources for cover and profile pictures
  app.get('/user/:id/recs/profilepicture', b(getProfilePicture));
  app.get('/user/:id/recs/coverpicture', b(getCoverPicture));

  app.delete('/user/:id/address', b(deleteAddress));
}

module.exports = router;