function createUser(req, res) {
  var user = req.body;
  user.type = 'user';

  User.create(user, function(err) {
    if(err)
      return res.error(err);

    res.status(201);
    res.end();
  });
}

function getUser(req, res) {
  User.getByUsername(req.params.username, function(err, user) {
    if(err)
      return res.error(err);

    if(!user) {
      res.status(404);
      res.end();
      return ;
    }

    res.json(user);
  });
}

function deleteUser(req, res) {
  User.getByUsername(req.params.username, function(err, user) {
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

      res.status(200);
      res.end();
    });
  });
}

function setAddress(req, res) {
  User.getByUsername(req.params.username, function(err, user) {
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

function getAddress(req, res) {
  User.getByUsername(req.params.username, function(err, user) {
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
      res.json(address);
    });
  });
}

var router = function(app) {
  app.post('/user', createUser);

  app.get('/user/:username', getUser);
  app.delete('/user/:username', deleteUser);

  app.put('/user/:username/address', setAddress);
  app.get('/user/:username/address', getAddress);
}

module.exports = router;