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

    if(!data.password)
      data.password = user.password;

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

    var address = req.body;
    address.type = 'address';

    User.setAddress(user.id, address, function(err) {
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
  User.get(req.params.id, function(err, user) {
    if(err)
      return res.error(err);

    if(!user) {
      res.status(404);
      res.end();
      return ;
    }

    User.getAddress(user.id, function(err, address) {
      if(err)
        return res.error(err);

      res.status(200);
      res.model(address);
    });
  });
}

var router = function(app) {
  app.post('/user', createUser);

  app.get('/user/:id', getUser);
  app.put('/user/:id', updateUser);
  app.delete('/user/:id', deleteUser);

  app.put('/user/:id/address', setAddress);
  app.get('/user/:id/address', getAddress);
  app.delete('/user/:id/address', deleteAddress);
}

module.exports = router;