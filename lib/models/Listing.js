var db = require('../utils/db.js');
var validator = require('../utils/validator.js');

Listing = {};

var schema = {
  type:'object',
  properties: {
    property_id : {
      type:'string',
      required:true,
      uuid:true
    },

    listing_agent_id : {
      type:'string',
      required:true,
      uuid:true
    },

    listing_agency_id : {
      type:'string',
      required:true,
      uuid:true
    },

    timestamp: {
      type:'number'
    }
  }
}

var validate = validator.bind(null, schema);

var insert_sql = 'INSERT INTO listings (property_id, listing_agent_id, listing_agency_id, timestamp) VALUES ($1,$2,$3,to_timestamp($4))';

Listing.create = function(listing, cb) {
  validate(listing, function(err) {
    if(err)
      return cb(err);

    db.query(insert_sql, [
      listing.property_id,
      listing.listing_agent_id,
      listing.listing_agency_id,
      listing.timestamp,
    ], cb);
  });
}

module.exports = function(){};