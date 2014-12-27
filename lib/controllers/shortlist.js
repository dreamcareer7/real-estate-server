function createShortlist(req, res) {
  var shortlist = req.body;

  Shortlist.create(shortlist, function(err, id) {
    if(err)
      return res.error(err);

    Shortlist.get(id, function(err, shortlist) {
      if(err)
        return res.error(err);

        res.status(201);
        res.model(shortlist);
    });
  });
}

function updateShortlist(req, res) {
  Shortlist.get(req.params.id, function(err, shortlist) {
    if(err)
      return res.error(err);

    if(!shortlist) {
      res.status(404);
      res.end();
      return ;
    }

    var data = req.body;

    Shortlist.update(shortlist.id, data, function(err) {
      if(err)
        return res.error(err);

      res.status(200);
      res.end();
    });
  });
}

function getShortlist(req, res) {
  Shortlist.get(req.params.id, function(err, shortlist) {
    if(err)
      return res.error(err);

    if(!shortlist) {
      res.status(404);
      res.end();
      return ;
    }

    res.model(shortlist);
  });
}

function getAllForUser(req, res) {
  Shortlist.getAllForUser(req.params.id, function(err, shortlists) {
    if (err)
      return res.error(err);

    if (!shortlists) {
      res.status(404);
      res.end();
      return ;
    }

    console.log(shortlists[0].full_count);
    res.collection(shortlists, 0, shortlists[0].full_count || 0)
  });
}

function getShortlistUsers(req, res) {
  Shortlist.getUsers(req.params.id, function(err, shortlist_users) {
    if(err)
      return res.error(err);

    if(!shortlist_users) {
      res.status(404);
      res.end();
      return ;
    }

    res.collection(shortlist_users, 0, shortlist_users[0].full_count || 0);
  });
}

function addShortlistUsers(req, res) {
  user_id = req.body.user_id;
  Shortlist.addUser(user_id, req.params.id, function(err, shortlist) {
    if (err)
      return res.error(err);

    res.success('success');
  });
}

function deleteShortlist(req, res) {
  Shortlist.get(req.params.id, function(err, shortlist) {
    if(err)
      return res.error(err);

    if(!shortlist) {
      res.status(404);
      res.end();
      return ;
    }

    Shortlist.delete(shortlist.id, function(err) {
      if(err)
        return res.error(err);

      res.status(204);
      res.end();
    });
  });
}


var router = function(app) {
  var b = app.auth.bearer;

  // Adding a Shortlist
  app.post('/shortlists', b(createShortlist));

  // Getting a Shortlist
  app.get('/shortlist/:id', b(getShortlist));

  // Updating a Shortlist
  app.put('/shortlist/:id', b(updateShortlist));

  // Deleting a Shortlist
  app.delete('/shortlist/:id', b(deleteShortlist));

  // Getting all Users on a Shortlist
  app.get('/shortlist/:id/users', b(getShortlistUsers));

  // Adding a User to a Shortlist
  app.put('/shortlist/:id/users', b(addShortlistUsers));

  // Getting all Shortlists for a certain User
  app.get('/user/:id/shortlists', b(getAllForUser));
}

module.exports = router;