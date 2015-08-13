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

    points: {
      required: true,
      type: 'array',
      minItems: 4,
      items: {
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
      }
    },

    horizontal_distance: {
      type: 'number',
      required: true
    },

    vertical_distance: {
      type: 'number',
      required: true
    },

    minimum_lot_square_meters: {
      type: 'number',
      required: false,
      minimum: 0
    },

    maximum_lot_square_meters: {
      type: 'number',
      required: false,
      minimum: 0
    },

    year_built: {
      type: 'number',
      required: false,
      minimum: 0
    },

    pool: {
      type: 'boolean',
      required: false
    },

    title: {
      type: 'string',
      required: true,
      minLength: 1
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
var sql_archive = require('../sql/alert/archive.sql');
var sql_shortlist = require('../sql/alert/shortlist.sql');
var sql_matching = require('../sql/alert/matching.sql');
var sql_remove_recs_refs = require('../sql/alert/remove_recs_refs.sql');

Alert.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
      return cb(null, false);

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
        return cb(null, {longitude: location.coordinates[0], latitude: location.coordinates[1], type: 'location'});
      },
      points: function(cb) {
        if(!alert.points)
          return cb();

        var points = JSON.parse(alert.points);
        points = points.coordinates[0].map(function(r) {
          return ({longitude: r[0], latitude: r[1], type: 'location'});
        });

        return cb(null, points);
      }
    }, function(err, results) {
         if(err)
           return cb(err);

         var res_final = alert;
         res_final.created_by = results.created_by || null;
         res_final.shortlist = results.shortlist || null;
         res_final.location = results.location || null;
         res_final.points = results.points || null;

         return cb(null, res_final);
       });
  });
}

Alert.getForShortlist = function(shortlist, cb) {
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

    User.get(alert.created_by, function(err, owner) {
      if(err)
        return cb(err);

      alert.title = (alert.title) ? alert.title : 'Alert #' + shortlist.alert_index;

      validate(alert, function(err) {
        if(err)
          return cb(err);

        var points = Alert.getGeomTextFromLocationArray(alert.points);

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
                              alert.title,
                              alert.horizontal_distance,
                              alert.vertical_distance,
                              points,
                              alert.year_built,
                              alert.pool,
                              alert.minimum_lot_square_meters,
                              alert.maximum_lot_square_meters],
                 function(err, res) {
                   if(err)
                     return cb(err);

                   var alert_id = res.rows[0].id;

                   Shortlist.incAlertIndex(shortlist_id, function(err, ok) {
                     if(err)
                       return cb(err);

                     Alert.get(alert_id, function(err, alert) {
                       if(err)
                         return cb(err);

                       Alert.recommendListings(alert.id, shortlist_id, function(err, results) {
                         if(err)
                           return cb(err);


                         var notification = {};

                         notification.action = 'Created';
                         notification.subject = alert.created_by.id;
                         notification.subject_class = 'User';
                         notification.object = alert_id;
                         notification.object_class = 'Alert';
                         notification.auxiliary_object = shortlist_id;
                         notification.auxiliary_object_class = 'Shortlist';
                         notification.message = '#' + shortlist.title + ': @' + owner.first_name + ' added a new Alert, check your new listings';

                         Notification.issueForShortlistExcept(shortlist_id, alert.created_by.id, notification, function(err, ok) {
                           if(err)
                             return cb(err);

                           return cb(null, alert);
                         });
                       });
                     });
                   });
                 });
      });
    });
  });
}

Alert.check = function(alert, cb) {
  User.get(alert.created_by, function(err, user) {
    if(err)
      return cb(err);

    alert.title = 'Dummy';
    alert.limit = (alert.limit) ? alert.limit : 50;

    validate(alert, function(err) {
      if(err)
        return cb(err);

      Alert.matchingListingsForAlertData(alert, function(err, listing_ids) {
        if(err)
          return cb(err);
        var total = listing_ids.length;

        listing_ids = listing_ids.slice(0, alert.limit);
        async.map(listing_ids, Listing.getCompact, function(err, listings) {
          if(err)
            return cb(err);

          if(listings[0])
            listings[0].total = total;

          return cb(null, listings);
        });
      });
    });
  });
}

Alert.recommendListings = function(id, shortlist_id, cb) {
  Alert.matchingListings(id, function(err, listings) {
    if(err)
      return cb(err);

    console.log('Matched listings:', listings);
    async.map(listings, function(r, cb) {
      console.log('---> Recommending', r, 'to', shortlist_id);
      var external_info = {};
      external_info.ref_object_id = id;

      return Shortlist.recommendListing(shortlist_id, r, external_info, cb);
    }, function(err, results) {
         if(err)
           return cb(err);

         return cb(null, results);
       });
  });
}

Alert.patch = function(shortlist_id, user_id, alert_id, alert, cb) {
  Shortlist.get(shortlist_id, function(err, shortlist) {
    if(err)
      return cb(err);

    Alert.get(alert_id, function(err, data) {
      if(err)
        return cb(err);

      User.get(user_id, function(err, user) {
        if(err)
          return cb(err);

        data.created_by = data.created_by.id;
        for(var i in alert)
          data[i] = alert[i];

        var points = Alert.getGeomTextFromLocationArray(data.points);
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
                             data.horizontal_distance,
                             data.vertical_distance,
                             points,
                             data.year_built,
                             data.pool,
                             data.minimum_lot_square_meters,
                             data.maximum_lot_square_meters,
                             alert_id],
                 function(err, res) {
                   if(err)
                     return cb(err);

                   Alert.get(alert_id, function(err, alert) {
                     if(err)
                       return cb(err);

                     Alert.removeFromRecommendationsReferences(alert_id, alert.shortlist.id, function(err, ok) {
                       if(err)
                         return cb(err);

                       Shortlist.hideOrphanedRecommendations(alert.shortlist.id, function(err, ok) {
                         if(err)
                           return cb(err);

                         Alert.recommendListings(alert_id, shortlist_id, function(err, reulsts) {
                           if(err)
                             return cb(err);

                           var notification = {};

                           notification.action = 'Edited';
                           notification.subject = user_id;
                           notification.subject_class = 'User';
                           notification.object =  alert_id;
                           notification.object_class = 'Alert';
                           notification.auxiliary_object = shortlist_id;
                           notification.auxiliary_object_class = 'Alert';
                           notification.message = '#' + shortlist.title + ': @' + user.first_name + ' edited an Alert, check your new listings';

                           Notification.issueForShortlistExcept(shortlist_id, user_id, notification, function(err, ok) {
                             if(err)
                               return cb(err);

                             return cb(null, alert);
                           });
                         });
                       });
                     });
                   });
                 });
      });
    });
  });
}

Alert.delete = function(id, cb) {
  Alert.get(id, function(err, alert) {
    if(err)
      return cb(err);

    Alert.removeFromRecommendationsReferences(id, alert.shortlist.id, function(err, ok) {
      if(err)
        return cb(err);

      Shortlist.hideOrphanedRecommendations(alert.shortlist.id, function(err, ok) {
        if(err)
          return cb(err);

        db.query(sql_delete, [id], function(err, res) {
          if(err)
            return cb(err);

          return cb(null, true);
        });
      });
    });
  });
}

Alert.archive = function(id, cb) {
  Alert.get(id, function(err, alert) {
    if(err)
      return cb(err);

    Alert.removeFromRecommendationsReferences(id, alert.shortlist.id, function(err, ok) {
      if(err)
        return cb(err);

      Shortlist.hideOrphanedRecommendations(alert.shortlist.id, function(err, ok) {
        if(err)
          return cb(err);

        db.query(sql_archive, [id], function(err, res) {
          if(err)
            return cb(err);

          return cb(null, true);
        });
      });
    });
  });
}

Alert.removeFromRecommendationsReferences = function(id, shortlist_id, cb) {
  db.query(sql_remove_recs_refs, [id, shortlist_id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, true);
  });
}

Alert.matchingListings = function(id, cb) {
  Alert.get(id, function(err, alert) {
    if(err)
      return cb(err);

    return Alert.matchingListingsForAlertData(alert, cb);
  });
}

Alert.matchingListingsForAlertData = function(alert, cb) {
  var points = Alert.getGeomTextFromLocationArray(alert.points);

  db.query(sql_matching, [alert.minimum_price,
                          alert.maximum_price,
                          alert.minimum_square_meters,
                          alert.maximum_square_meters,
                          alert.min_bedrooms,
                          alert.min_bathrooms,
                          alert.property_type,
                          '{' + alert.property_subtypes.join(',') + '}',
                          points,
                          alert.year_built,
                          alert.pool,
                          alert.minimum_lot_square_meters,
                          alert.maximum_lot_square_meters],
           function(err, res) {
             if(err)
               return cb(err);

             var listings = res.rows.map(function(r) {
                              return r.id;
                            });

             return cb(null, listings);
           });
}

Alert.getGeomTextFromLocationArray = function(array) {
  var points = array.map(function(r) {
                 return (r.longitude + ' ' + r.latitude);
               });

  points = 'POLYGON((' + points.join(',') + '))';

  return points;
}

Alert.publicize = function(model) {
  if (model.created_by) User.publicize(model.created_by);
  if (model.shortlist) Shortlist.publicize(model.shortlist);

  return model;
}

module.exports = function(){};