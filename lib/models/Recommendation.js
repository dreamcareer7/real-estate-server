/**
 * @namespace Recommendation
 */

var async                     = require('async');
var db                        = require('../utils/db.js');
var sql                       = require('../utils/require_sql.js');
var validator                 = require('../utils/validator.js');

var sql_insert                = require('../sql/recommendation/insert.sql');
var sql_get                   = require("../sql/recommendation/get.sql");
var sql_add_reference_to_recs = require('../sql/recommendation/add_reference_to_recs.sql');
var sql_unhide_recs           = require('../sql/recommendation/unhide_recs.sql');
var sql_counts                = require('../sql/recommendation/counts.sql');
var sql_map                   = require('../sql/recommendation/map.sql');

sql_feed                      = require('../sql/recommendation/feed.sql');
sql_actives                   = require('../sql/recommendation/actives.sql');
sql_seen                      = require('../sql/recommendation/seen.sql');
sql_favorites                 = require('../sql/recommendation/favorites.sql');
sql_tours                     = require('../sql/recommendation/tours.sql');
sql_add_read                  = require('../sql/recommendation/add_read.sql');
sql_remove_read               = require('../sql/recommendation/remove_read.sql');
sql_add_favorite              = require('../sql/recommendation/add_favorite.sql');
sql_remove_favorite           = require('../sql/recommendation/remove_favorite.sql');
sql_add_tour                  = require('../sql/recommendation/add_tour.sql');
sql_remove_tour               = require('../sql/recommendation/remove_tour.sql');

Recommendation = {};

/**
 * * `MLS`
 * * `Zillow`
 * * `Trulia`
 * * `Realtor`
 * @typedef source
 * @type {string}
 * @memberof Recommendation
 * @instance
 * @enum {string}
 */

/**
 * * `Listing`
 * * `User`
 * * `Bank`
 * * `Card`
 * @typedef type
 * @type {string}
 * @memberof Recommendation
 * @instance
 * @enum {string}
 */

/**
 * @typedef recommendation
 * @type {object}
 * @memberof Recommendation
 * @instance
 * @property {uuid} id - ID of this `recommendation`
 * @property {Recommendation#source} source - Indicates from where this recommendation originally came to Rechat
 * @property {string} source_url - URL of the original source
 * @property {uuid} room - ID of the `room` this `recommendation` belongs to
 * @property {uuid} listing - ID of the `listing` this recommendation points to
 * @property {Recommendation#type} recommendation_type - Indicates the type for this `recommendation` eg. Listing, User, etc.
 * @property {uuid[]} referring_objects - ID of `alert` objects, causing this recommendation to surface
 * @property {number} matrix_unique_id - Unique ID of this listing on the MLS system, also known as MUI.
 * @property {timestamp} created_at - indicates when this object was created
 * @property {timestamp=} updated_at - indicates when this object was last modified
 * @property {timestamp=} deleted_at - indicates when this object was deleted
 */

var schema = {
  type: 'object',
  properties: {
    recommendation_type: {
      type: 'string',
      required: true,
      enum: [ 'Listing', 'User', 'Bank', 'Card' ]
    },

    source: {
      type: 'string',
      required: true,
      enum: [ 'MLS', 'Zillow', 'Trulia', 'Realtor' ]
    },

    source_url: {
      type: 'string',
      required: false
    },

    room: {
      type: 'string',
      uuid: true,
      required: true
    },

    listing: {
      type: 'string',
      uuid: true,
      required: true
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    }
 }
}

var validate = validator.bind(null, schema);


/**
 * Inserts a `recommendation` object into database
 * @memberof Recommendation
 * @instance
 * @public
 * @param {Recommendation#recommendation} recommendation - full recommendation object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the `recommendation` object created
 */
function insert(recommendation, cb) {
  db.query(sql_insert, [
    recommendation.recommendation_type,
    recommendation.source,
    recommendation.source_url,
    recommendation.referring_objects,
    recommendation.room,
    recommendation.listing,
    recommendation.matrix_unique_id
  ], function(err, res) {
       if(err)
         return cb(err);

       return cb(null, res.rows[0].id);
     });
}

/**
 * Retrieves a set of `Recommendation` objects based on the criteria **set**
 * @name getSetForUserOnRoom
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {string} set - set of recommendations in question. This can be `feed`, `favorites`, `tours`, `actives`, `seen`
 * @param {uuid} user_id - ID of the user to fetch recommendation set for
 * @param {uuid} room_id - ID of the room to fetch recommendations from
 * @param {pagination} paging - pagination parameters
 * @param {callback} cb - callback function
 * @returns {User#user}
 */
Recommendation.getSetForUserOnRoom = function(set, user_id, room_id, paging, cb) {
  var set_sql = global['sql_' + set];

  if(!set_sql)
    return cb(Error.Validation('Requested set is not known'));

  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    Room.get(room_id, function(err, room) {
      if(err)
      return cb(err);

      var filter = (paging.filter) ? ('{' + paging.filter + '}') : null;
      db.query(set_sql, [user_id, room_id, filter, paging.type, paging.timestamp, paging.limit], function(err, res) {
        if(err)
          return cb(err);

        var recommendation_ids = res.rows.map(function(r) {
          return r.id;
        });

        async.map(recommendation_ids, Recommendation.get, function(err, recommendations) {
          if(err)
            return cb(err);

          if (res.rows.length > 0)
            recommendations[0].total = res.rows[0].total;

          return cb(null, recommendations);
        });
      });
    });
  });
};

Recommendation.getCounts = function(recommendation_id, cb) {
  var counts = {
    comment_count: 0,
    document_count: 0,
    image_count: 0,
    video_count: 0
  };

  db.query(sql_counts, [recommendation_id], function(err, res) {
    if(err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, counts);

    counts.comment_count = res.rows[0].comment_count;
    counts.document_count = res.rows[0].document_count;
    counts.image_count = res.rows[0].image_count;
    counts.video_count = res.rows[0].video_count;

    return cb(null, counts);
  });
}

Recommendation.patch = function(property, action, user_id, recommendation_id, notify, cb) {
  async.auto({
    user: function(cb) {
      return User.get(user_id, cb);
    },
    sql: function(cb) {
      var _action = (action) ? 'add_' : 'remove_';
      var _cmd = global['sql_' + _action + property];

      if(!_cmd)
        return cb(Error.Validation('Requested action or property is not known'));

      return cb(null, _cmd);
    },
    recommendation: ['user',
      'sql',
      function(cb, results) {
        Recommendation.get(recommendation_id, cb);
      }],
    listing:[
      'recommendation',
      (cb, results) => {
        Listing.get(results.recommendation.listing, cb)
      }
    ],
    patch: ['recommendation',
            function(cb, results) {
              db.query(results.sql, [user_id, recommendation_id], cb);
            }],
    room: ['patch',
           function(cb, results) {
             return Room.get(results.recommendation.room, cb);
           }],
    notification: ['room',
                   'user',
                   'recommendation',
                   function(cb, results) {
                     if(notify) {
                       var notification = {};
                       var address_line = Address.getLocalized(results.listing.property.address);
                       notification.subject = user_id;
                       notification.subject_class = 'User';
                       notification.object = recommendation_id;
                       notification.object_class = 'Recommendation';
                       notification.recommendation = recommendation_id;
                       notification.room = results.recommendation.room;

                       if(property == 'favorite' && action) {
                         notification.action = 'Favorited';
                         notification.message = '#' + results.room.title + ': @' + results.user.first_name + ' favorited ' + address_line;
                         notification.message = notification.message.trim();

                         return Notification.issueForRoomExcept(notification, user_id, cb);
                       } else if (property == 'tour' && action) {
                         notification.action = 'TourRequested';
                         notification.message = '[TOUR ALERT] #' + results.room.title
                                              + ': @' + results.user.first_name + ' wants to go see ' + address_line;
                         notification.message = notification.message.trim();
                         return Notification.issueForRoomExcept(notification, user_id, cb);
                       } else {
                         return cb();
                       }
                     } else {
                       return cb();
                     }
                   }],
    updated: ['notification', cb => Recommendation.get(recommendation_id, cb)]
  }, function(err, results) {
       if(err)
         return cb(err);

       return cb(null, results.updated);
     });
};

/**
 * Retrieves a `Recommendation` objects
 * @name get
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {uuid} recommendation_id - ID of the referenced recommendation
 * @param {callback} cb - callback function
 * @returns {Recommendation#recommendation}
 */
Recommendation.get = function(recommendation_id, cb) {
  db.query(sql_get, [recommendation_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Recommendation not found'));

    var recommendation = res.rows[0];

    Recommendation.getCounts(recommendation_id, (err, counts) => {
      if(err)
        return cb(err);

      recommendation.comment_count  = counts.comment_count;
      recommendation.document_count = counts.document_count;
      recommendation.video_count    = counts.video_count;
      recommendation.image_count    = counts.image_count;
    })

    cb(null, recommendation);
  });
};

/**
 * Creates a `recommendation` object
 * @name create
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {Recommendation#recommendation} recommendation - full recommendation object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the `recommendation` object created
 */
Recommendation.create = function(recommendation, cb) {
  validate(recommendation, function(err) {
    if(err)
      return cb(err);

    Room.get(recommendation.room, function(err, room) {
      if (err)
        return cb(err);
      Listing.get(recommendation.listing, function(err, room) {
        if (err)
          return cb(err);

        return insert(recommendation, cb);
      });
    });
  });
};

/**
 * Generates necessary recommendation objects for a listing for all alerts on our system. It also
 * adds alert references to existing recommendation objects. **This is a time consuming function**
 * @name generateForListing
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {uuid} id - ID of the referenced listing
 * @param {callback} cb - callback function
 * @returns {Recommendation#recommendation[]} An array containing all recommendation objects created
 */
Recommendation.generateForListing = function(id, cb) {
  Listing.get(id, function(err, listing) {
    if(err)
      return cb(err);

    if(!listing.property.address.location)
      return cb(null, null);

    if(listing.status != 'Active')
      return cb(null, null);

    var address_line = Address.getLocalized(listing.property.address);

    Listing.matchingRoomsByAlerts(id, function(err, sat_list) {
      if(err)
        return cb(err);

      async.mapSeries(sat_list, function(sat, cb) {
        var external_info = {};
        external_info.ref_alert_id = sat.id;
        external_info.notification = 'Hit';

        Room.recommendListing(sat.room, listing.id, external_info, function(err, results) {
          if(err)
            return cb(null, null);

          return cb(null, results);
        });
      }, function(err, recs) {
           if(err)
             return cb(err);

           recs = recs.filter(Boolean);
           return cb(null, recs);
         });
    });
  });
};

/**
 * Adds a reference to a recommendation object references.
 * @name addReferenceToRecommendations
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} listing_id - ID of the referenced listing
 * @param {uuid} object_id - ID of the referenced object
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Recommendation.addReferenceToRecommendations = function(room_id, listing_id, object_id, cb) {
  db.query(sql_add_reference_to_recs, [room_id, listing_id, object_id], cb);
};

/**
 * Unhides a recommendation object corresponding to a listing within the context of a room
 * @name unhideListingOnRoom
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} listing_id - ID of the referenced listing
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Recommendation.unhide = function(recommendation_id, cb) {
  db.query(sql_unhide_recs, [recommendation_id], cb);
};

/**
 * Strips a recommendation object of all sensitive data for public consumption
 * @name publicize
 * @function
 * @memberof Recommendation
 * @instance
 * @public
 * @param {Recommendation#recommendation} model - full recommendation object
 * @param {callback} cb - callback function
 * @returns {Recommendation#recommendation} modified recommendation object
 */
Recommendation.publicize = function(model) {
  if (model.room) delete model.room;
  if (model.listing) Listing.publicize(model.listing);
  if (model.favorited_by) model.favorited_by.map(User.publicize);
  if (model.tour_requested_by) model.tour_requested_by.map(User.publicize);

  return model;
};

Recommendation.mapListingOnRoom = function(room_id, listing_id, cb) {
  db.query(sql_map, [room_id, listing_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Recommendation not matched on room for this listing'));

    return cb(null, res.rows[0].id);
  });
};

Recommendation.associations = {
  listing: {
    optional: true,
    model: 'Listing'
  },

  favorited_by: {
    collection: true,
    model: 'User',
    default_value: ()=>[]
  },

  tour_requested_by: {
    collection: true,
    model: 'User',
    default_value: ()=>[]
  }
}

module.exports = function() {};
