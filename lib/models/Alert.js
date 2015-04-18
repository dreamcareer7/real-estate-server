var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');
var crypto = require('crypto');
var sql = require('../utils/require_sql.js');
var async = require('async');

Alert = {};

var schema = {
  type: 'object',
  properties: {
    minimum_price: {
      type: 'number',
      minimum: 0,
      required: true
    },

    maximum_price: {
      type: 'number',
      minimum: 0,
      required: true
    },

    min_bedrooms: {
      type: 'number',
      minimum: 0,
      maximum: 3,
      required: true
    },

    min_bathrooms: {
      type: 'number',
      minimum: 1,
      maximum: 4,
      required: true
    },

    minimum_square_meters: {
      type: 'number',
      minimum: 0,
      required: true
    },

    maximum_square_meters: {
      type: 'number',
      minimum: 0,
      required: true
    },

    created_by: {
      type: 'string',
      uuid: true,
      required: true
    },

    location: {
      type: 'object',
      properties: {
        latitude: {
          type: 'number',
          required: true
        },

        longitude: {
          type: 'number',
          required: true
        }
      }
    },

    minimum_lot_size: {
      type: 'number',
      required: false,
      minimum: 0
    },

    maximum_lot_size: {
      type: 'number',
      required: false,
      minimum: 0
    },

    title: {
      type: 'string',
      required: false
    },

    property_type: {
      type: 'string',
      required: true,
      enum: ['Residential', 'Residential Lease', 'Multi-Family', 'Commercial' ,'Lots & Acreage'],
    },

    property_subtypes: {
      required: true,
      type: 'array',
      uniqueItems: true,
      items: {
        enum: ['MUL-Apartment/5Plex+', 'MUL-Fourplex', 'MUL-Full Duplex', 'MUL-Multiple Single Units', 'MUL-Triplex',
               'LSE-Apartment', 'LSE-Condo/Townhome', 'LSE-Duplex', 'LSE-Fourplex', 'LSE-House', 'LSE-Mobile', 'LSE-Triplex',
               'LND-Commercial', 'LND-Farm/Ranch', 'LND-Residential',
               'RES-Condo', 'RES-Farm/Ranch', 'RES-Half Duplex', 'RES-Single Family', 'RES-Townhouse',
               'COM-Lease', 'COM-Sale' ,'COM-Sale or Lease (Either)', 'COM-Sale/Leaseback (Both)']
      }
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with recommendation objects
var sql_get = require("../sql/alert/get.sql");
var sql_insert = require('../sql/alert/insert.sql');
var sql_patch = require('../sql/alert/patch.sql');
var sql_delete = require('../sql/alert/delete.sql');
var sql_shortlist = require('../sql/alert/shortlist.sql');
var sql_matching = require('../sql/alert/matching.sql');

Alert.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
      return cb(Error.ResourceNotFound());

    var alert = res_base.rows[0];

    async.parallel({
      created_by: function(cb) {
        if (!alert.created_by)
          return cb();

        User.get(alert.created_by, cb);
      },
      shortlist: function(cb) {
        if(!alert.shortlist)
          return cb();

        Shortlist.get(alert.shortlist, cb);
      },
      location: function(cb) {
        if(!alert.location)
          return cb();

        var location = JSON.parse(alert.location);
        return cb(null, {longitude: location.coordinates[0], latitude: location.coordinates[1], type: "location"});
      }
    }, function(err, results) {
         var res_final = alert;
         res_final.created_by = results.created_by || null;
         res_final.shortlist = results.shortlist || null;
         res_final.location = results.location || null;

         return cb(null, res_final);
       });
  });
}

Alert.getOnShortlist = function(shortlist, cb) {
  db.query(sql_shortlist, [shortlist], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var alert_ids = res.rows.map(function(r) {
                      return r.id;
                    });
    async.map(alert_ids, Alert.get, function(err, alerts) {
      if(err)
        return cb(err);

      return cb(null, alerts);
    });
  });
}

Alert.create = function(shortlist_id, alert, cb) {
  Shortlist.get(shortlist_id, function(err, shortlist) {
    if(err)
      return cb(err);

    validate(alert, function(err) {
      if(err)
        return cb(err);

      db.query(sql_insert, [alert.currency,
                            alert.minimum_price,
                            alert.maximum_price,
                            alert.min_bedrooms,
                            alert.min_bathrooms,
                            alert.minimum_square_meters,
                            alert.maximum_square_meters,
                            alert.created_by,
                            shortlist_id,
                            alert.location.longitude,
                            alert.location.latitude,
                            alert.property_type,
                            '{' + alert.property_subtypes.join(',') + '}',
                            'Hotsheet ' + shortlist.alert_index],
               function(err, res) {
                 if(err)
                   return cb(err);

                 Shortlist.incAlertIndex(shortlist_id, function(err, ok) {
                   if(err)
                     return cb(err);

                   Alert.get(res.rows[0].id, function(err, alert) {
                     if(err)
                       return cb(err);

                     cb(null, alert);

                     Alert.recommendListings(alert.id, shortlist_id, function(err, reulsts) {
                       if(err)
                         console.log('ERR-CRIT: (CREATE FLOW) on recommendting listings to shortlists with id:', shortlist_id, 'err:', err);
                     });
                   });
                 });
               });
    });
  });
}

Alert.recommendListings = function(id, shortlist_id, cb) {
  Alert.matchingListings(alert.id, function(err, listings) {
    var listing_ids = listings.map(function(r) {
                        return r.id;
                      });

    async.map(listing_ids, function(r, cb) {
      return Shortlist.recommendListing(shortlist_id, r, cb);
    }, function(err, results) {
         if(err) {
           return cb(err);
         }

         return cb(null, results);
       });
  });
}

Alert.patch = function(shortlist_id, alert_id, alert, cb) {
  Alert.get(alert_id, function(err, data) {
    if(err)
      return cb(err);

    data.created_by = data.created_by.id;
    for(var i in alert)
      data[i] = alert[i];

    db.query(sql_patch, [data.currency,
                         data.minimum_price,
                         data.maximum_price,
                         data.min_bedrooms,
                         data.min_bathrooms,
                         data.minimum_square_meters,
                         data.maximum_square_meters,
                         data.created_by,
                         shortlist_id,
                         data.location.longitude,
                         data.location.latitude,
                         data.property_type,
                         '{' + data.property_subtypes.join(',') + '}',
                         data.title,
                         alert_id],
             function(err, res) {
               if(err)
                 return cb(err);

               Alert.get(alert_id, function(err, alert) {
                 if(err)
                   return cb(err);

                 cb(null, alert);

                 Alert.recommendListings(alert_id, shortlist_id, function(err, reulsts) {
                   if(err)
                     console.log('ERR-CRIT: (PATCH FLOW) on recommendting listings to shortlists with id:', shortlist_id, 'err:', err);
                 });
               });
             });
  });
}

Alert.delete = function(id, cb) {
  Alert.get(id, function(err, alert) {
    if(err)
      return cb(err);

    db.query(sql_delete, [id], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, true);
    });
  });
}

Alert.matchingListings = function(id, cb) {
  Alert.get(id, function(err, alert) {
    if(err)
      return cb(err);

    db.query(sql_matching, [alert.minimum_price,
                            alert.maximum_price,
                            alert.minimum_square_meters,
                            alert.maximum_square_meters,
                            alert.min_bedrooms,
                            alert.min_bathrooms,
                            alert.property_type,
                            '{' + alert.property_subtypes.join(',') + '}'],
             function(err, res) {
               if(err)
                 return cb(err);

               var listings = res.rows.map(function(r) {
                                return r.id;
                              });

               return cb(null, listings);
             });
  });
}

Alert.publicize = function(model) {
  if (model.created_by) User.publicize(model.created_by);
  if (model.shortlist) Shortlist.publicize(model.shortlist);

  return model;
}
