var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var async = require('async');

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
      required: true,
      uuid: true
    },

    listing_agency_id: {
      type: 'string',
      required: true,
      uuid: true
    },

    altering_agent: {
      type: 'string',
      required: false,
      uuid: true
    }
  }
}

var validate = validator.bind(null, schema);

var insert_sql = 'INSERT INTO listings \
(property_id, listing_agent_id, listing_agency_id, timestamp) \
VALUES ($1, $2, $3, now()) \
RETURNING id';
function insert(listing, cb) {
  db.query(insert_sql, [
    listing.property_id,
    listing.listing_agent_id,
    listing.listing_agency_id
    ], function(err, res) {
         if(err) {
           return cb(err)
         }

         return cb(null, res.rows[0].id)
       });
}

var get_sql = "SELECT\
 'listing' AS type,\
 listings.*,\
 EXTRACT(EPOCH FROM listings.created_at)::INT AS created_at,\
 EXTRACT(EPOCH FROM listings.updated_at)::INT AS updated_at\
 FROM listings\
 WHERE listings.id = $1";
Listing.get = function(id, cb) {
  var res_property;
  var res_final;

  db.query(get_sql, [id], function(err, res_base) {
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

          User.get(listing.alerting_agent, cb);
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

var delete_sql = 'DELETE FROM listings WHERE id = $1';
Listing.delete = function(id, cb) {
  db.query(delete_sql, [id], function(err, res) {
    if(err)
      return cb(err);
  });
}

Listing.publicize = function(model) {
  delete model.property_id;
  delete model.property.address_id;
  delete model.alerting_agent_id;
  delete model.listing_agent_id;
  delete model.listing_agency_id;

  if (model.listing_agent) User.publicize(model.listing_agent);
  if (model.alerting_agent) User.publicize(model.alerting_agent);

  return model;
}

module.exports = function(){};