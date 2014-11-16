function listUsers(req, res) {

}

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

var router = function(app) {
  app.get('/user', listUsers);
  app.get('/user/:username', getUser);
  app.delete('/user/:username', deleteUser);
  app.post('/user', createUser);
}

module.exports = router;