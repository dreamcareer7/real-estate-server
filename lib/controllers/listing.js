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

var searchAreas = (req, res) => {
  var term = req.query.q;
  if(term && term.length < 3)
    term = null;

  var parents = req.query.parents ? ObjectUtil.queryStringArray(req.query.parents) : null;

  if(!term && !parents)
    res.error(Error.Validation('Supply a query or parent'));

  Listing.searchAreas(term, parents, (err, areas) => {
    if(err)
      return res.error(err);

    res.collection(areas);
  });
}

var searchCounties = (req, res) => {
  var term = req.query.q;
  if(term && term.length < 3)
    term = null;

  if(!term)
    res.error(Error.Validation('Supply a query'));

  Listing.searchCounties(term, (err, counties) => {
    if(err)
      return res.error(err);

    res.collection(counties);
  });
}

var searchSubdivisions = (req, res) => {
  var term = req.query.q;
  if(term && term.length < 3)
    term = null;

  if(!term)
    res.error(Error.Validation('Supply a query'));

  Listing.searchSubdivisions(term, (err, subdivisions) => {
    if(err)
      return res.error(err);

    res.collection(subdivisions);
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.get('/areas/search', app.auth.optionalBearer(searchAreas));
  app.get('/counties/search', app.auth.optionalBearer(searchCounties));
  app.get('/subdivisions/search', app.auth.optionalBearer(searchSubdivisions));

  app.get('/listings/search', app.auth.optionalBearer(searchListings));
  app.get('/listings/:mls_number/similars', b(getSimilars));
  app.get('/listings/:id', app.auth.optionalBearer(getListing));
  app.post('/listings/:id/inquiry', b(listingInquiry));

};

module.exports = router;
