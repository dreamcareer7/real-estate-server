/**
 * @namespace Alert
 */

var validator             = require('../utils/validator.js');
var db                    = require('../utils/db.js');
var config                = require('../config.js');
var crypto                = require('crypto');
var sql                   = require('../utils/require_sql.js');
var async                 = require('async');
var _u                    = require('underscore');

var sql_get               = require('../sql/alert/get.sql');
var sql_insert            = require('../sql/alert/insert.sql');
var sql_patch             = require('../sql/alert/patch.sql');
var sql_delete            = require('../sql/alert/delete.sql');
var sql_search            = require('../sql/alert/search.sql');
var sql_room              = require('../sql/alert/room.sql');
var sql_user              = require('../sql/alert/user.sql');
var sql_matching          = require('../sql/alert/matching.sql');
var sql_remove_recs_refs  = require('../sql/alert/remove_recs_refs.sql');
var sql_get_by_mls_number = require('../sql/alert/get_by_mls_number.sql');
var sql_refresh_filters   = require('../sql/alert/refresh_filters.sql');
var sql_rec_count         = require('../sql/alert/rec_count.sql');

var html_alert_share_body = require('../html/alert/share.html');
var asc_alert_share_body  = require('../asc/alert/share.asc');

/**
 * @typedef alert
 * @type {object}
 * @memberof Alert
 * @instance
 * @property {uuid} id - ID of this `alert`
 * @property {string} currency - three letter currency code
 * @property {string} title - title of this alert
 * @property {float} minimum_price - minimum price of properties matching this alert
 * @property {float} maximum_price - maximum price of properties matching this alert
 * @property {float} minimum_square_meters - minimum square meter of the properties matching this alert
 * @property {float} maximum_square_meters - maximum square meter of the properties matching this alert
 * @property {number} minimum_bedrooms - minimum number of bedrooms a property must have to be a match against this alert
 * @property {number} minimum_bathrooms - minimum number of bathrooms a property must have to be a match against this alert
 * @property {uuid} created_by - ID of the user who created this alert
 * @property {uuid} room - ID of the room this alert belongs to
 * @property {Address#point} location - center of the geometric search area. *DEPRECATED*
 * @property {string} cover_image_url - URL of the cover image for this alert
 * @property {Listing#property_type} property_type - type of properties to match against this alert
 * @property {Listing#property_subtype[]} property_subtypes - an array of property subtypes to match against this alert
 * @property {Address#point[]} points - an array of geometric points forming a polygon for search area
 * @property {float} horizontal_distance - horizontal distance of the center of the search area to the top-center of the search area
 * @property {float} vertical_distance - vertical distance of the center of the search area to the center-left of the search area
 * @property {number} minimum_year_built - minimum year built of the property to get matched against this alert
 * @property {number} maximum_year_built - maximum year built of the property to get matched against this alert
 * @property {float} minimum_lot_square_meters - minimum square meter of lot total for properties to get matched against this alert
 * @property {float} maximum_lot_square_meters - maximum square meter of lot total for properties to get matched against this alert
 * @property {boolean} pool - indicates whether pool is mandatory: true means mandatory, false means shouldn't have a pool, null is don't care
 * @property {number} dom - maximum total number of days on market for a property to get matched against this alert
 * @property {number} cdom - maximum current number of days on market for a property to get matched against this alert
 * @property {timestamp} created_at - indicates when this object was created
 * @property {timestamp=} updated_at - indicates when this object was last modified
 * @property {timestamp=} deleted_at - indicates when this object was deleted
 */

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

    minimum_bedrooms: {
      type: 'number',
      minimum: 0,
      required: true
    },

    minimum_bathrooms: {
      type: 'number',
      minimum: 0,
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

    minimum_year_built: {
      type: 'number',
      required: false,
      minimum: 0
    },

    maximum_year_built: {
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
      enum: ['Residential', 'Residential Lease', 'Multi-Family', 'Commercial', 'Lots & Acreage']
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
          'COM-Lease', 'COM-Sale', 'COM-Sale or Lease (Either)', 'COM-Sale/Leaseback (Both)']
      }
    },

    listing_statuses: {
      required: true,
      type: 'array',
      uniqueItems: true,
      minItems: 1,
      items: {
        enum: ['Active', 'Sold', 'Pending',
               'Temp Off Market', 'Leased', 'Active Option Contract',
               'Active Contingent', 'Active Kick Out', 'Withdrawn',
               'Expired', 'Cancelled', 'Withdrawn Sublisting',
               'Incomplete', 'Incoming']
      }
    },

    open_house: {
      type: 'boolean',
      required: true
    },

    minimum_sold_date: {
      type: 'number',
      required: false
    }
  }
};

var validate = validator.bind(null, schema);

Alert.get = function (alert_id, cb) {
  db.query(sql_get, [alert_id], (err, res_base) => {
    if (err) {
      return cb(err);
    }

    if (res_base.rows.length < 1)
      return cb(Error.ResourceNotFound('Alert not found'));

    var alert = res_base.rows[0];

    if(alert.location) {
      var l = JSON.parse(alert.location);
      alert.location = {longitude: l.coordinates[0], latitude: l.coordinates[1], type: 'location'};
    }

    if(alert.points) {
      var points = JSON.parse(alert.points);
      alert.points = points.coordinates[0].map(function (r) {
        return ({longitude: r[0], latitude: r[1], type: 'location'});
      });
    }

    cb(null, alert);
  });
};

Alert.validatePointsArray = function(alert, cb) {
  var p1 = alert.points[0];
  var p2 = alert.points[alert.points.length - 1];

  if((p1.longitude != p2.longitude) ||
     (p1.latitude != p2.latitude))
    return cb(Error.Validation('Points array must form a closed polygon with at least 4 points'));

  return cb();
};

Alert.create = function(room_id, alert, cb) {
  async.auto({
    room: cb => {
      return Room.get(room_id, cb);
    },
    owner: cb => {
      return User.get(alert.created_by, cb);
    },
    validate: cb => {
      validate(alert, err => {
        if(err)
          return cb(err);

        return Alert.validatePointsArray(alert, cb);
      });
    },
    insert: [
      'room',
      'owner',
      'validate',
      (cb, results) => {
        var points = Address.getGeomTextFromLocationArray(alert.points);

        db.query(sql_insert, [
          alert.currency,
          alert.minimum_price,
          alert.maximum_price,
          alert.minimum_bedrooms,
          alert.minimum_bathrooms,
          alert.minimum_square_meters,
          alert.maximum_square_meters,
          alert.created_by,
          room_id,
          alert.location.longitude,
          alert.location.latitude,
          alert.property_type,
          '{' + alert.property_subtypes.join(',') + '}',
          alert.title,
          alert.horizontal_distance,
          alert.vertical_distance,
          points,
          alert.minimum_year_built,
          alert.maximum_year_built,
          alert.pool,
          alert.minimum_lot_square_meters,
          alert.maximum_lot_square_meters,
          '{' + alert.listing_statuses.join(',') + '}',
          alert.open_house,
          alert.minimum_sold_date
        ],
          (err, res) => {
            if (err)
              return cb(err);

            return cb(null, res.rows[0].id);
          });
      }
    ],
    alert: [
      'insert',
      (cb, results) => {
        return Alert.get(results.insert, cb);
      }
    ],
    recommend_listings: [
      'alert',
      (cb, results) => {
        return Alert.recommendListings(results.insert, room_id, cb);
      }
    ],
    notification: [
      'owner',
      'recommend_listings',
      (cb, results) => {
        var notification = {};

        notification.action = 'Created';
        notification.subject = results.owner.id;
        notification.subject_class = 'User';
        notification.object = results.insert;
        notification.object_class = 'Alert';
        notification.auxiliary_object = room_id;
        notification.auxiliary_object_class = 'Room';
        notification.message = '#' + results.room.title + ': @' + results.owner.first_name + ' added a new Alert, check your new listings';
        notification.room = room_id;

        notification.alert_results = {
          listing: (results.recommend_listings && results.recommend_listings.length > 0) ? results.recommend_listings[0] : null,
          count: (results.recommend_listings) ? results.recommend_listings.length : 0
        };

        Notification.issueForRoomExcept(notification, results.owner.id, cb);
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err);

    return cb(null, results.alert);
  });
};

Alert.patch = function(room_id, user_id, alert_id, alert, cb) {
  async.auto({
    room: cb => {
      return Room.get(room_id, cb);
    },
    user: cb => {
      return User.get(user_id, cb);
    },
    before: cb => {
      return Alert.get(alert_id, cb);
    },
    update: ['room',
      'user',
      'before',
      (cb, results) => {
        var next = results.before;

        for (var i in alert)
          next[i] = alert[i];

        next.points = Address.getGeomTextFromLocationArray(next.points);

        db.query(sql_patch, [
          next.currency,
          next.minimum_price,
          next.maximum_price,
          next.minimum_bedrooms,
          next.minimum_bathrooms,
          next.minimum_square_meters,
          next.maximum_square_meters,
          next.created_by,
          room_id,
          next.location.longitude,
          next.location.latitude,
          next.property_type,
          '{' + next.property_subtypes.join(',') + '}',
          next.title,
          next.horizontal_distance,
          next.vertical_distance,
          next.points,
          next.minimum_year_built,
          next.maximum_year_built,
          next.pool,
          next.minimum_lot_square_meters,
          next.maximum_lot_square_meters,
          '{' + next.listing_statuses.join(',') + '}',
          next.open_house,
          next.minimum_sold_date,
          alert_id
        ], cb);
      }],
    alert: [
      'update',
      (cb, results) => {
        return Alert.get(alert_id, cb);
      }
    ],
    remove_from_recommendations: [
      'alert',
      (cb, results) => {
        Alert.removeFromRecommendationsReferences(alert_id, results.alert.room, cb);
      }
    ],
    hide_orphaned_recommendations: [
      'alert',
      'remove_from_recommendations',
      (cb, results) => {
        Room.hideOrphanedRecommendations(results.alert.room, cb);
      }
    ],
    recommend_listings: [
      'alert',
      (cb, results) => {
        return Alert.recommendListings(alert_id, room_id, cb);
      }
    ],
    notification: [
      'room',
      'user',
      'recommend_listings',
      (cb, results) => {
        var notification = {};

        notification.action = 'Edited';
        notification.subject = user_id;
        notification.subject_class = 'User';
        notification.object = alert_id;
        notification.object_class = 'Alert';
        notification.auxiliary_object = room_id;
        notification.auxiliary_object_class = 'Room';
        notification.message = '#' + results.room.title + ': @' + results.user.first_name + ' edited an Alert, check your new listings';
        notification.room = room_id;

        Notification.issueForRoomExcept(notification, user_id, cb);
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err);

    return cb(null, results.alert);
  });
};

Alert.check = function (alert, cb) {
  alert.title = 'Dummy';
  alert.limit = (typeof(alert.limit) != 'undefined') ? alert.limit : 50;

  async.auto({
    validate: cb => {
      validate(alert, err => {
        if(err)
          return cb(err);

        return Alert.validatePointsArray(alert, cb);
      });
    },
    matching: [
      'validate',
      (cb, results) => {
        Alert.matchingListingsForAlertData(alert, cb);
      }
    ],
    compact_listings: [
      'matching',
      (cb, results) => {
        var total = results.matching.length;
        var listing_ids = results.matching.slice(0, alert.limit);

        Listing.getCompacts(listing_ids, (err, listings) => {
          if (listings[0])
            listings[0].total = total;
          cb(err, listings);
        });
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err);

    return cb(null, results.compact_listings);
  });
};

Alert.getByMlsNumber = function(mls_number, cb) {
  db.query(sql_get_by_mls_number, [
      mls_number
  ], (err, listing) => {
    if (err)
      return cb(err);
    return cb(null,listing.rows[0]);
  });
};

Alert.recommendListings = function(alert_id, room_id, cb) {
  Alert.matchingListings(alert_id, (err, listings) => {
    if (err)
      return cb(err);

    Room.recommendListings(room_id, listings, {ref_alert_id: alert_id}, err => {
      if(err)
        return cb(err);

      return cb(null, listings);
    });
  });
};

Alert.delete = function (alert_id, cb) {
  async.auto({
    alert: cb => {
      Alert.get(alert_id, cb);
    },
    deref: [
      'alert',
      (cb, results) => {
        Alert.removeFromRecommendationsReferences(alert_id, results.alert.room, cb);
      }
    ],
    hide: [
      'alert',
      'deref',
      (cb, results) => {
        Room.hideOrphanedRecommendations(results.alert.room, cb);
      }
    ],
    delete: [
      'hide',
      cb => {
        return db.query(sql_delete, [alert_id], cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb();
  });
};

Alert.removeFromRecommendationsReferences = function(alert_id, room_id, cb) {
  db.query(sql_remove_recs_refs, [alert_id, room_id], cb);
};

Alert.matchingListings = function(alert_id, cb) {
  Alert.get(alert_id, (err, alert) => {
    if (err)
      return cb(err);

    return Alert.matchingListingsForAlertData(alert, cb);
  });
};

Alert.matchingListingsForAlertData = function(alert, cb) {
  var points = Address.getGeomTextFromLocationArray(alert.points);

  db.query(sql_matching, [
    alert.minimum_price,
    alert.maximum_price,
    alert.minimum_square_meters,
    alert.maximum_square_meters,
    alert.minimum_bedrooms,
    alert.minimum_bathrooms,
    alert.property_type,
    '{' + alert.property_subtypes.join(',') + '}',
    alert.minimum_year_built,
    alert.maximum_year_built,
    alert.pool,
    alert.minimum_lot_square_meters,
    alert.maximum_lot_square_meters,
    points,
    alert.open_house,
    '{' + alert.listing_statuses.join(',') + '}',
    alert.minimum_sold_date
  ], (err, res) => {
    if (err)
      return cb(err);

    var listings = res.rows.map( r => r.id );

    return cb(null, listings);
  });
};

Alert.getSet = function (set, id, cb) {
  db.query(set, [id], (err, res) => {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, []);

    var alert_ids = res.rows.map( r => r.id );

    async.map(alert_ids, Alert.get, (err, alerts) => {
      if (err)
        return cb(err);

      return cb(null, alerts);
    });
  });
};

Alert.getForRoom = function(room_id, cb) {
  return Alert.getSet(sql_room, room_id, cb);
};

Alert.getForUser = function(user_id, cb) {
  return Alert.getSet(sql_user, user_id, cb);
};

Alert.stringSearch = function(user_id, strings, cb) {
  var regexps = ObjectUtil.makeRegexps(strings);

  db.query(sql_search, [user_id, regexps], (err, res) => {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, []);

    var alert_ids = res.rows.map(r => {
      return r.id;
    });

    async.map(alert_ids, Alert.get, (err, alerts) => {
      if (err)
        return cb(err);

      return cb(null, alerts);
    });
  });
};

Alert.refreshFilters = function(cb) {
  db.query(sql_refresh_filters, [], cb);
};

Alert.processEmail = function(job, cb) {
  var data = job.data;

  return Email.send({
    from: 'Rechat <support@' + config.email.seamless_address + '>',
    to: [ data.to ],
    source: config.email.source,
    html_body: html_alert_share_body,
    suppress_outer_template: true,
    mailgun_options: {
      'h:Reply-To': data.from
    },
    message: {
      body: {
        html: {
          data: ''
        },
        text: {
          data: ''
        }
      },
      subject: {
        data: data.subject
      }
    },
    template_params: data
  }, cb);
};

Alert.processSMS = function(job, cb) {
  var data = job.data;

  if(!data.to)
    return cb();

  return SMS.send({
    from: config.twilio.from,
    to: data.to,
    body: asc_alert_share_body,
    template_params: data
  }, cb);
};

Alert.sendAsEmail = function(data, cb) {
  Alert.send('email', data, cb);
};

Alert.sendAsSMS = function(data, cb) {
  Alert.send('sms', data, cb);
};

Alert.send = function(transport, data, cb) {
  var statuses = data.alert.listing_statuses;
  statuses = _u.without(statuses, 'Active Option Contract');
  statuses = _u.without(statuses, 'Active Contingent');
  statuses = _u.without(statuses, 'Active Kick Out');

  var job_data = {
    first_name: data.user.first_name,
    alert_title: data.alert.title,
    // sender_name: Resolved by async.auto
    listing_count: data.count || 0,
    bedroom_count: data.alert.minimum_bedrooms || '',
    bathroom_count: data.alert.minimum_bathrooms || '',
    square_meters: Listing.getSquareFeet(data.alert.minimum_square_meters) || '',
    status: statuses.join(', '),
    alert_uri: config.webapp.base_url + '/dashboard/recents/' + data.room.id + '?alert=' + data.alert.id + '&token=' + encodeURIComponent(data.token),
    listing_uri: config.webapp.base_url,
    subject: '[Rechat] ' + data.room.title,
    mls_terms: config.webapp.base_url + '/terms/mls',
    url:     config.webapp.base_url,
    _title: ''
  };

  var job_type = 'alert_share_' + transport;

  switch(transport) {
  case 'sms':
    job_data.to = data.user.phone_number;
    job_data.from = config.twilio.from;
    break;

  case 'email':
    job_data.to = data.user.email;
    job_data.from = data.room.id + '@' + config.email.seamless_address;
    break;
  }

  if(!job_data.to)
    return cb();

  async.auto({
    sender: cb => {
      return User.get(data.sender, (err, user) => {
        if(err)
          return cb(err);

        job_data.sender_name = user.first_name;
        job_data.sender_full_name = (user.first_name ? user.first_name : '') + ' ' + (user.last_name ? user.last_name : '');
        job_data.avatar = user.profile_image_url || 'http://assets.rechat.com/mail/avatar.png';
        job_data.agency_phone = User.getFormattedPhoneNumber(user.phone_number) || '';
        job_data.agent_details = 'Details';

        return cb();
      });
    },
    office: cb => {
      return User.getOffice(data.sender, (err, office) => {
        if(err)
          return cb(err);

        job_data.agency_name = (office) ? (office.name ? office.name : '') : '';

        return cb();
      });
    },
    send: [
      'sender',
      'office',
      (cb, results) => {
        var job = Job.queue.create(job_type, job_data).removeOnComplete(true);
        process.domain.jobs.push(job);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb();
  });
};

Alert.getRecommendationCounts = function(alert_id, cb) {
  db.query(sql_rec_count, [alert_id], (err, res) => {
    if(err)
      return cb(err);

    return cb(null, res.rows[0].count);
  });
};

Alert.publicize = function(model) {
  if (model.created_by) User.publicize(model.created_by);
  if (model.room) Room.publicize(model.room);
  if (model.users) model.users.map(User.publicize);

  return model;
};

Alert.associations = {
  created_by: {
    optional: true,
    model: 'User'
  }
}

module.exports = function() {

};
