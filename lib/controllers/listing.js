// FIXME
// Ref: #1
function createListing(req, res) {
  var listing = req.body;

  Listing.create(listing, function(err, id) {
    if(err)
      return res.error(err);

    Listing.get(id, function(err, listing) {
      if(err)
        return res.error(err);

        res.status(201);
        res.model(listing);
    });
  });
}

// FIXME
// Ref: #1
function updateListing(req, res) {
  Listing.get(req.params.id, function(err, listing) {
    if(err)
      return res.error(err);

    if(!listing) {
      res.status(404);
      res.end();
      return ;
    }

    var data = req.body;

    Listing.update(listing.id, data, function(err) {
      if(err)
        return res.error(err);

      res.status(200);
      res.end();
    });
  });
}

function getListing(req, res) {
  Listing.get(req.params.id, function(err, listing) {
    if(err)
      return res.error(err);

    if(!listing) {
      res.status(404);
      res.end();
      return ;
    }

    res.model(listing);
  });
}

function getListingByMLSNumber(req, res) {
  Listing.getByMLSNumber(req.params.id, function(err, listing) {
    if(err)
      return res.error(err);

    if(!listing) {
      res.status(404);
      return res.end();
    }

    res.model(listing);
  });
}

function searchListings(req, res) {
  if (req.query.mui) {
    var mui = req.query.mui;

    Listing.getByMUI(mui, function(err, listing) {
      if(err)
        return res.error(err);

      res.model(listing);
    });
  } else if(req.query.mls_number) {
    var mls_number = req.query.mls_number;

    Listing.getByMLSNumber(mls_number, function(err, listing) {
      if(err)
        return res.error(err);

      res.model(listing);
    });
  } else if(req.query.q) {
    var terms  = ObjectUtil.queryStringArray(req.query.q);
    var status = req.query.status ? ObjectUtil.queryStringArray(req.query.status) : null;

    if(req.user.user_type === 'Client' && Array.isArray(status)) {
      status = status
        .filter( state => state !== 'Leased' )
        .filter( state => state !== 'Sold' )
    }

    Listing.stringSearch(terms, status, function(err, listings) {
      if(err)
        return res.error(err);

      return res.collection(listings);
    });
  } else {
    return res.error(Error.MethodNotAllowed());
  }
}

// FIXME
// Ref: #1
function deleteListing(req, res) {
  Listing.get(req.params.id, function(err, listing) {
    if(err)
      return res.error(err);

    if(!listing) {
      res.status(404);
      res.end();
      return ;
    }

    Listing.delete(listing.id, function(err) {
      if(err)
        return res.error(err);

      res.status(204);
      res.end();
    });
  });
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

function getSimilars(req, res) {
  Listing.getSimilars(req.params.mls_number, (err, similars) => {
    if(err)
      return res.error(err);

    res.collection(similars);
  });
}


var router = function(app) {
  var b = app.auth.bearer;

  // FIXME
  // Ref: #1
  // app.post('/listings', app.auth.clientPassword(createListing));

  app.get('/listings/search', b(searchListings));
  app.get('/listings/:id', b(getListing));
  app.get('/listings/:mls_number/similars', b(getSimilars));
  // FIXME
  // Ref: #1
  // app.put('/listing/:id', b(updateListing));
  // app.delete('/listing/:id', b(deleteListing));
}

module.exports = router;
