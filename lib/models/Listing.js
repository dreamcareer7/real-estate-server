var db = require('../utils/db.js');
var validator = require('../utils/validator.js');

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
    },

    timestamp: {
      type:'number'
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

var get_sql = "SELECT *, 'listing' AS TYPE FROM listings \
INNER JOIN properties ON listings.property_id = properties.id \
INNER JOIN addresses ON properties.address_id = addresses.id \
WHERE listings.id = $1";
Listing.get = function(id, cb) {
  db.query(get_sql, [id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, false);

    cb(null, res.rows[0]);
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

module.exports = function(){};