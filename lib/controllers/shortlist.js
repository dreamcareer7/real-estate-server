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

function patchShortlist(req, res) {
  var shortlist_id = req.params.id;
  var data = req.body;

  Shortlist.patch(shortlist_id, data, function(err, shortlist) {
    if(err)
      return res.error(err);

    res.model(shortlist);
  });
}

function getShortlist(req, res) {
  var user_id = req.params.uid;
  var shortlist_id = req.params.sid;

  Shortlist.getForUser(shortlist_id, user_id, function(err, shortlist) {
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

    res.collection(shortlists);
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
  var user_id = req.body.user_id;
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

function recommendManually(req, res) {
  var shortlist_id = req.params.id;
  var listing_id = req.body.listing_id;

  var external_info = {};
  external_info.ref_object_id = req.body.ref_object_id;
  external_info.source = req.body.source;
  external_info.source_url = req.body.source_url;

  Shortlist.recommendListing(shortlist_id, listing_id, external_info, function(err, recs) {
    if(err)
      return res.error(err);

    res.status(200);
    return res.end();
  });
}

function recommendManuallyByMLSNumber(req, res) {
  var shortlist_id = req.params.id;
  var mls_number = req.body.mls_number;
  var external_info = {};

  external_info.ref_object_id = req.body.ref_object_id;
  external_info.source = req.body.source;
  external_info.source_url = req.body.source_url;

  Listing.getByMLSNumber(mls_number, function(err, listing) {
    if(err)
      return res.error(err);

    Shortlist.recommendListing(shortlist_id, listing.id, external_info, function(err, recs) {
      if(err)
        return res.error(err);

      res.status(200);
      return res.end();
    });
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  // Adding a Shortlist
  app.post('/shortlists', b(createShortlist));

  // Getting a Shortlist
  app.get('/shortlists/:sid/users/:uid', b(getShortlist));

  // Updating a Shortlist
  app.put('/shortlists/:id', b(updateShortlist));

  // Patching a Shortlist
  app.patch('/shortlists/:id', b(patchShortlist));

  // Deleting a Shortlist
  app.delete('/shortlists/:id', b(deleteShortlist));

  // Getting all Users on a Shortlist
  app.get('/shortlists/:id/users', b(getShortlistUsers));

  // Adding a User to a Shortlist
  app.post('/shortlists/:id/users', b(addShortlistUsers));

  // Getting all Shortlists for a certain User
  app.get('/users/:id/shortlists', b(getAllForUser));

  // Manually recommending a listing to a shortlist
  app.post('/shortlists/:id/manual/mls', b(recommendManuallyByMLSNumber));
  app.post('/shortlists/:id/manual/id', b(recommendManually));
}

module.exports = router;