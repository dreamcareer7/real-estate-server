var async     = require('async');
var validator = require('../utils/validator.js');

var schema_listing_inquiry = {
  type: 'object',
  properties: {
    agent: {
      type: 'string',
      uuid: true,
      required: false
    },
    listing: {
      type: 'string',
      uuid: true,
      required: true
    },
    brand: {
      type: 'string',
      uuid: true,
      required: true
    },
    source_type: {
      type: 'string',
      required: true,
      enum: [
        'BrokerageWidget',
        'IOSAddressBook',
        'SharesRoom',
        'ExplicitlyCreated'
      ]
    }
  }
};

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

  if(req.query.q && req.query.q.match(/[A-z]{3,}|[0-9]{5,}/)) {
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
      return validator(schema_listing_inquiry, r, cb);
    },
    do: [
      'validate',
      (cb, results) => {
        return Listing.inquiry(
          user_id,
          listing_id,
          r.agent,
          r.brand,
          r.source_type,
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
