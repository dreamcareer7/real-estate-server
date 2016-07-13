var async = require('async');

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
      return res.model(listing);
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
      return res.end();
    }

    var data = req.body;

    Listing.update(listing.id, data, function(err) {
      if(err)
        return res.error(err);

      res.status(200);
      return res.end();
    });
  });
}

function getListing(req, res) {
  Listing.get(req.params.id, function(err, listing) {
    if(err)
      return res.error(err);

    if(!listing) {
      res.status(404);
      return res.end();
    }

    return res.model(listing);
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

    return res.model(listing);
  });
}

function searchListings(req, res) {
  if (req.query.mui) {
    var mui = req.query.mui;

    return Listing.getByMUI(mui, function(err, listing) {
      if(err)
        return res.error(err);

      return res.model(listing);
    });
  }

  if(req.query.mls_number) {
    var mls_number = req.query.mls_number;

    return Listing.getByMLSNumber(mls_number, function(err, listing) {
      if(err)
        return res.error(err);

      return res.model(listing);
    });
  }

  var areas = Alert.parseArea(req.query.q);

  if(req.query.q && areas) {
    // Its an MLS area search
    return Listing.getStatuses((err, allStatuses) => {
      var status = req.query.status ? ObjectUtil.queryStringArray(req.query.status) : allStatuses;

      Listing.getByArea(req.query.q, status, (err, listings) => {
        if(err)
          return res.error(err);

        return res.collection(listings);
      });
    });
  }

  if(req.query.q && req.query.q.match(/[A-z]{3,}/)) {
    return Listing.getStatuses((err, allStatuses) => {
      var status = req.query.status ? ObjectUtil.queryStringArray(req.query.status) : allStatuses;

      // .filter( state => state !== 'Leased' )
      // .filter( state => state !== 'Sold' );
      if(!req.user) {
        status = status;
      }

      Listing.stringSearch(req.query.q, status, function(err, listings) {
        if(err)
          return res.error(err);

        return res.collection(listings);
      });
    });
  }

  return res.error(Error.MethodNotAllowed());
}

// FIXME
// Ref: #1
function deleteListing(req, res) {
  Listing.get(req.params.id, function(err, listing) {
    if(err)
      return res.error(err);

    if(!listing) {
      res.status(404);
      return res.end();
    }

    Listing.delete(listing.id, function(err) {
      if(err)
        return res.error(err);

      res.status(204);
      return res.end();
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

    return res.collection(similars);
  });
}

function listingInquiry(req, res) {
  console.log(req.body);
  var r = req.body;
  var user_id = req.user.id;
  var listing_id = req.params.id;

  var external_info = {
    ref_user_id: user_id,
    source: 'MLS',
    source_url: 'https://mls.org',
    notification: 'Share'
  };

  async.auto({
    validate: cb => {
      if(!r.source_type)
        return cb(Error.Validation('You need to provide a source_type to make an inquiry'));

      return cb();
    },
    listing: cb => {
      return Listing.get(listing_id, cb);
    },
    agent: cb => {
      if(!r.agent)
        return cb(Error.Validation('You need to provide an agent to make an inquiry'));

      return Agent.get(r.agent, cb);
    },
    brand: cb => {
      if(!r.brand)
        return cb(Error.Validation('You need to provide a brand to make an inquiry'));

      return Brand.get(r.brand, cb);
    },
    do: [
      'validate',
      'listing',
      'agent',
      'brand',
      (cb, results) => {
        return Listing.inquiry(
          user_id,
          listing_id,
          results.agent,
          results.brand,
          r.source_type,
          r.brand,
          external_info,
          cb
        );
      }
    ]
  }, (err, results) => {
    if(err)
      return res.error(err);

    res.status(204);
    return res.end();
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  // FIXME
  // Ref: #1
  // app.post('/listings', app.auth.clientPassword(createListing));

  app.get('/listings/search', app.auth.optionalBearer(searchListings));
  app.get('/listings/:mls_number/similars', b(getSimilars));
  app.get('/listings/:id', app.auth.optionalBearer(getListing));
  app.post('/listings/:id/inquiry', b(listingInquiry));

  // FIXME
  // Ref: #1
  // app.put('/listing/:id', b(updateListing));
  // app.delete('/listing/:id', b(deleteListing));
};

module.exports = router;
