var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var async = require('async');
var sql = require('../utils/require_sql.js');

Listing = {};

var schema = {
  type: 'object',
  properties: {
    property_id: {
      type: 'string',
      required: true,
      uuid: true
    },

    listing_agent_id: {
      type: 'string',
      required: false,
      uuid: true
    },

    listing_agency_id: {
      type: 'string',
      required: false,
      uuid: true
    },

    altering_agent: {
      type: 'string',
      required: false,
      uuid: true
    },

    status: {
      type: 'string',
      required: 'true',
      enum: ['Active', 'Sold', 'Pending',
             'Temp Off Market', 'Leased', 'Active Option Contract',
             'Active Contingent', 'Active Kick Out', 'Withdrawn',
             'Expired','Cancelled']
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with Listing object
var sql_insert = require('../sql/listing/insert.sql');
var sql_update = require('../sql/listing/update.sql');
var sql_get = require('../sql/listing/get.sql');
var sql_get_mui = require('../sql/listing/get_mui.sql');
var sql_delete = require('../sql/listing/delete.sql');
var sql_matching = require('../sql/listing/matching.sql');

function insert(listing, cb) {
  db.query(sql_insert, [
    listing.property_id,
    listing.alerting_agent_id,
    listing.listing_agent_id,
    listing.listing_agency_id,
    listing.currency,
    listing.price,
    listing.status,
    listing.matrix_unique_id,
    listing.original_price,
    listing.last_price,
    listing.low_price
  ], function(err, res) {
       if(err) {
         return cb(err)
       }

       return cb(null, res.rows[0].id)
     });
}

Listing.get = function(id, cb) {
  var res_property;
  var res_final;

  db.query(sql_get, [id], function(err, res_base) {
    if(err)
      return cb(err);

    if(res_base.rows.length < 1)
      return cb(Error.ResourceNotFound('Listing not found'));

    var listing = res_base.rows[0];

    Property.get(listing.property_id, function(err, property) {
      if (err)
        return cb(err);

      res_property = property;
      async.parallel({
        alerting_agent: function(cb) {
          if (!listing.alerting_agent) {
            cb();
            return;
          }

          User.get(listing.alerting_agent_id, cb);
        },
        listing_agent: function(cb) {
          if (!listing.listing_agent_id) {
            cb();
            return;
          }

          User.get(listing.listing_agent_id, cb);
        },
        listing_agency: function(cb) {
          if (!listing.listing_agency_id) {
            cb();
            return;
          }

          Agency.get(listing.listing_agency_id, cb);
        }
      }, function(err, results) {
           res_final = listing;
           res_final.property = res_property;
           res_final.alerting_agent = results.alerting_agent || null;
           res_final.listing_agent = results.listing_agent || null;
           res_final.listing_agency = results.listing_agency || null;
           cb(null, res_final);
         });
    });
  });
}

// FIXME: Creating a listing requires all following parameters:
// A listing data, a property data and an address data. This also
// applies to updating. It's not clear at this point how we intend
// on designing this without any knowledge of the MLS protocol.
// Ref: #1 desc
Listing.create = function(listing, cb) {
  validate(listing, function(err) {
    if(err) {
      return cb(err);
    }

    insert(listing, cb);
  });
}

Listing.update = function(id, listing, cb) {
  Listing.get(id, function(err, data) {
    if(err)
      return cb(err);

    db.query(sql_update, [listing.alerting_agent_id,
                          listing.listing_agent_id,
                          listing.listing_agency_id,
                          listing.currency,
                          listing.price,
                          listing.status,
                          listing.original_price,
                          listing.last_price,
                          listing.low_price,
                          id],
             function(err, res) {
               if(err)
                 return cb(err);

               Listing.get(id, cb);
             });
  });
}

Listing.delete = function(id, cb) {
  db.query(sql_delete, [id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, true);
  });
}

Listing.getByMUI = function(id, cb) {
  db.query(sql_get_mui, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound());

    Listing.get(res.rows[0].id, cb);
  });
}

Listing.matchingShortlistsbyAlerts = function(id, cb) {
  Listing.get(id, function(err, listing) {
    if(err)
      return cb(err);

    db.query(sql_matching, [listing.price,
                            listing.property.square_meters,
                            listing.property.bedroom_count,
                            listing.property.bathroom_count],
             function(err, res) {
               if(err)
                 return cb(err);

               var shortlists = res.rows.map(function(r) {
                                  return r.shortlist;
                                });

               return cb(null, shortlists);
             });
  });
}

Listing.publicize = function(model) {
  if (model.listing_agent) User.publicize(model.listing_agent);
  if (model.alerting_agent) User.publicize(model.alerting_agent);
  if (model.listing_agency) Agency.publicize(model.listing_agency);
  if (model.property) Property.publicize(model.property);

  delete model.property_id;
  delete model.property.address_id;
  delete model.alerting_agent_id;
  delete model.listing_agent_id;
  delete model.listing_agency_id;

  return model;
}

module.exports = function(){};