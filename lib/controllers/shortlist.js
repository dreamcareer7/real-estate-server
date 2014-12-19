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

// function updateShortlist(req, res) {
//   Shortlist.get(req.params.id, function(err, shortlist) {
//     if(err)
//       return res.error(err);

//     if(!shortlist) {
//       res.status(404);
//       res.end();
//       return ;
//     }

//     var data = req.body;

//     Shortlist.update(shortlist.id, data, function(err) {
//       if(err)
//         return res.error(err);

//       res.status(200);
//       res.end();
//     });
//   });
// }

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

function getShortlistUsers(req, res) {
  Shortlist.getUsers(req.params.id, function(err, shortlist_users) {
    if(err)
      return res.error(err);

    if(!shortlist_users) {
      res.status(404);
      res.end();
      return ;
    }

    res.collection(shortlist_users);
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

  app.post('/shortlists', b(createShortlist));
  app.get('/shortlist/:id', b(getShortlist));
  // app.put('/shortlist/:id', b(updateShortlist));
  app.delete('/shortlist/:id', b(deleteShortlist));
  app.get('/shortlist/:id/users', b(getShortlistUsers));
  app.put('/shortlist/:id/users', b(addShortlistUsers));
}

module.exports = router;