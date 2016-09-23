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
var numeral               = require('numeral');

var sql_get               = require('../sql/alert/get.sql');
var sql_insert            = require('../sql/alert/insert.sql');
var sql_patch             = require('../sql/alert/patch.sql');
var sql_delete            = require('../sql/alert/delete.sql');
var sql_search            = require('../sql/alert/search.sql');
var sql_room              = require('../sql/alert/room.sql');
var sql_user              = require('../sql/alert/user.sql');
var sql_remove_recs_refs  = require('../sql/alert/remove_recs_refs.sql');
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
 * @property {string} title - title of this alert
 * @property {float} minimum_price - minimum price of properties matching this alert
 * @property {float} maximum_price - maximum price of properties matching this alert
 * @property {float} minimum_square_meters - minimum square meter of the properties matching this alert
 * @property {float} maximum_square_meters - maximum square meter of the properties matching this alert
 * @property {number} minimum_bedrooms - minimum number of bedrooms a property must have to be a match against this alert
 * @property {number} minimum_bathrooms - minimum number of bathrooms a property must have to be a match against this alert
 * @property {uuid} created_by - ID of the user who created this alert
 * @property {uuid} room - ID of the room this alert belongs to
 * @property {Listing#property_types} property_types - an array of property types of properties to match against this alert
 * @property {Listing#property_subtype[]} property_subtypes - an array of property subtypes to match against this alert
 * @property {Address#point[]} points - an array of geometric points forming a polygon for search area
 * @property {number} minimum_year_built - minimum year built of the property to get matched against this alert
 * @property {number} maximum_year_built - maximum year built of the property to get matched against this alert
 * @property {float} minimum_lot_square_meters - minimum square meter of lot total for properties to get matched against this alert
 * @property {float} maximum_lot_square_meters - maximum square meter of lot total for properties to get matched against this alert
 * @property {boolean} pool - indicates whether pool is mandatory: true means mandatory, false means shouldn't have a pool, null is don't care
 * @property {timestamp} created_at - indicates when this object was created
 * @property {timestamp=} updated_at - indicates when this object was last modified
 * @property {timestamp=} deleted_at - indicates when this object was deleted
 */

Alert = {};

Orm.register('alert', Alert);

var schema = {
  type: 'object',
  properties: {
    minimum_price: {
      type: ['null', 'number'],
      minimum: 0,
      required: false
    },

    maximum_price: {
      type: ['null', 'number'],
      minimum: 0,
      required: false
    },

    minimum_bedrooms: {
      type: ['null', 'number'],
      minimum: 0,
      required: false
    },

    minimum_bathrooms: {
      type: ['null', 'number'],
      minimum: 0,
      required: false
    },

    minimum_square_meters: {
      type: ['null', 'number'],
      minimum: 0,
      required: false
    },

    maximum_square_meters: {
      type: ['null', 'number'],
      minimum: 0,
      required: false
    },

    created_by: {
      type: [ 'null', 'string' ],
      uuid: true
    },

    points: {
      required: true,
      type: ['null', 'array'],
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

    minimum_lot_square_meters: {
      type: ['null', 'number'],
      required: false,
      minimum: 0
    },

    maximum_lot_square_meters: {
      type: ['null', 'number'],
      required: false,
      minimum: 0
    },

    minimum_year_built: {
      type: ['null', 'number'],
      required: false,
      minimum: 0
    },

    maximum_year_built: {
      type: ['null', 'number'],
      required: false,
      minimum: 0
    },

    pool: {
      type: ['null', 'boolean'],
      required: false
    },

    title: {
      type: [ 'null', 'string' ],
      required: false
    },

    property_types: {
      type: ['null', 'array'],
      uniqueItems: true,
      required: false,
      items: {
        enum: [ 'Residential', 'Residential Lease', 'Multi-Family', 'Commercial', 'Lots & Acreage' ]
      }
    },

    property_subtypes: {
      required: false,
      type: ['null', 'array'],
      uniqueItems: true,
      items: {
        enum: [
          'MUL-Apartment/5Plex+',
          'MUL-Fourplex',
          'MUL-Full Duplex',
          'MUL-Multiple Single Units',
          'MUL-Triplex',
          'LSE-Apartment',
          'LSE-Condo/Townhome',
          'LSE-Duplex',
          'LSE-Fourplex',
          'LSE-House',
          'LSE-Mobile',
          'LSE-Triplex',
          'LND-Commercial',
          'LND-Farm/Ranch',
          'LND-Residential',
          'RES-Condo',
          'RES-Farm/Ranch',
          'RES-Half Duplex',
          'RES-Single Family',
          'RES-Townhouse',
          'COM-Lease',
          'COM-Sale',
          'COM-Sale or Lease (Either)',
          'COM-Sale/Leaseback (Both)'
        ]
      }
    },

    listing_statuses: {
      required: false,
      type: ['null', 'array'],
      uniqueItems: true,
      minItems: 1,
      items: {
        enum: [
          'Active',
          'Sold',
          'Pending',
          'Temp Off Market',
          'Leased',
          'Active Option Contract',
          'Active Contingent',
          'Active Kick Out',
          'Withdrawn',
          'Expired',
          'Cancelled',
          'Withdrawn Sublisting',
          'Incomplete',
          'Incoming'
        ]
      }
    },

    open_house: {
      type: [ 'null', 'boolean'],
      required: false
    },

    minimum_sold_date: {
      type: [ 'null', 'number' ],
      required: false
    },

    excluded_listing_ids: {
      type: [ 'null', 'array' ],
      uniqueItems: true,
      minItems: 0,
      items: {
        type: 'string',
        uuid: true
      }
    }
  }
};

var validate = validator.bind(null, schema);

Alert.get = function (alert_id, cb) {
  db.query(sql_get, [alert_id], (err, res_base) => {
    if(err)
      return cb(err);

    if (res_base.rows.length < 1)
      return cb(Error.ResourceNotFound('Alert ' + alert_id + ' not found'));

    var alert = res_base.rows[0];

    if(alert.points) {
      var points = JSON.parse(alert.points);
      alert.points = points.coordinates[0].map(function (r) {
        return ({longitude: r[0], latitude: r[1], type: 'location'});
      });
    }

    alert.proposed_title = Alert.proposeTitle(alert);

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

        if(!alert.points)
          return cb();

        return Alert.validatePointsArray(alert, cb);
      });
    },
    insert: [
      'room',
      'owner',
      'validate',
      (cb, results) => {
        var points = alert.points ? Address.getGeomTextFromLocationArray(alert.points) : null;

        db.query(sql_insert, [
          alert.minimum_price,
          alert.maximum_price,
          alert.minimum_square_meters,
          alert.maximum_square_meters,
          alert.minimum_bedrooms,
          alert.minimum_bathrooms,
          alert.created_by,
          room_id,
          alert.property_types,
          alert.property_subtypes,
          alert.title,
          points,
          alert.minimum_year_built,
          alert.maximum_year_built,
          alert.pool,
          alert.minimum_lot_square_meters,
          alert.maximum_lot_square_meters,
          alert.listing_statuses,
          alert.open_house,
          alert.minimum_sold_date,
          JSON.stringify(alert.mls_areas),
          alert.list_agents,
          alert.list_offices,
          alert.counties,
          alert.minimum_parking_spaces,
          alert.architectural_styles,
          alert.subdivisions,
          alert.school_districts,
          alert.primary_schools,
          alert.middle_schools,
          alert.elementary_schools,
          alert.senior_high_schools,
          alert.junior_high_schools,
          alert.intermediate_schools,
          alert.sort_order,
          alert.sort_office,
          alert.selling_agents,
          alert.selling_offices,
          alert.offices,
          alert.agents,
          alert.high_schools,
          alert.excluded_listing_ids
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
        return Alert.recommendListings(results.insert, room_id, alert.excluded_listing_ids, cb);
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
        notification.message = '#' + results.room.proposed_title + ': @' + results.owner.first_name + ' added a new Alert, check your new listings';
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
    update: [
      'room',
      'user',
      'before',
      (cb, results) => {
        var next = results.before;

        for (var i in alert)
          next[i] = alert[i];

        next.points = next.points ? Address.getGeomTextFromLocationArray(next.points) : null;

        db.query(sql_patch, [
          next.minimum_price,
          next.maximum_price,
          next.minimum_square_meters,
          next.maximum_square_meters,
          next.minimum_bedrooms,
          next.minimum_bathrooms,
          next.property_types,
          next.property_subtypes,
          next.title,
          next.points,
          next.minimum_year_built,
          next.maximum_year_built,
          next.pool,
          next.minimum_lot_square_meters,
          next.maximum_lot_square_meters,
          next.listing_statuses,
          next.open_house,
          next.minimum_sold_date,
          JSON.stringify(next.mls_areas),
          next.list_agents,
          next.list_offices,
          next.counties,
          next.minimum_parking_spaces,
          next.architectural_styles,
          next.subdivisions,
          next.school_districts,
          next.primary_schools,
          next.middle_schools,
          next.elementary_schools,
          next.senior_high_schools,
          next.junior_high_schools,
          next.intermediate_schools,
          next.sort_order,
          next.sort_office,
          next.selling_agents,
          next.selling_offices,
          next.offices,
          next.agents,
          next.schools,
          next.excluded_listing_ids,
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
        return Alert.recommendListings(alert_id, room_id, alert.excluded_listing_ids, cb);
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
        notification.message = '#' + results.room.proposed_title + ': @' + results.user.first_name + ' edited an Alert, check your new listings';
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

Alert.check = function (alert_ref, cb) {
  var alert = _u.clone(alert_ref);

  alert.title = 'Dummy';
  alert.limit = (typeof(alert.limit) != 'undefined') ? alert.limit : 50;

  async.auto({
    validate: cb => {
      validate(alert, err => {
        if(err)
          return cb(err);

        if(!alert.points)
          return cb();

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
        var matching = results.matching.listings;
        matching = _u.difference(matching, alert.excluded_listing_ids || []);
        var total = results.matching.total - (alert.excluded_listing_ids ? alert.excluded_listing_ids.length : 0);
        var listing_ids = matching.slice(0, alert.limit);

        Listing.getCompacts(listing_ids, (err, listings) => {
          if (listings[0])
            listings[0].total = total;

          return cb(err, listings);
        });
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err);

    return cb(null, results.compact_listings);
  });
};

Alert.recommendListings = function(alert_id, room_id, exclude, cb) {
  Alert.matchingListings(alert_id, (err, listings) => {
    if (err)
      return cb(err);

    listings = _u.difference(listings, exclude || []);

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

    return Alert.matchingListingsForAlertData(alert, (err, results) => {
      if(err)
        return cb(err);

      return cb(null, results.listings);
    });
  });
};

var buildQuery = require('../sql/alert/matching.js');

Alert.matchingListingsForAlertData = function(alert, cb) {
  var query = buildQuery(alert);

  var q = query.toParam();

  db.query(q.text, q.values, (err, res) => {
    if (err)
      return cb(err);

    var listings = res.rows.map( r => r.id );

    return cb(null, {
      listings: listings,
      total: (res.rows[0] ? res.rows[0].total : 0)
    });
  });
};

Alert.getSet = function (set, id, paging, cb) {
  db.query(set, [
    id,
    paging.type,
    paging.timestamp,
    paging.limit
  ], (err, res) => {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, []);

    var alert_ids = res.rows.map( r => r.id );

    async.map(alert_ids, Alert.get, (err, alerts) => {
      if (err)
        return cb(err);

      alerts[0].total = res.rows[0].total;

      return cb(null, alerts);
    });
  });
};

Alert.getForRoom = function(room_id, paging, cb) {
  return Alert.getSet(sql_room, room_id, paging, cb);
};

Alert.getForUser = function(user_id, paging, cb) {
  return Alert.getSet(sql_user, user_id, paging, cb);
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

var transports = {};

transports.sms = function(data, cb) {
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
    first_name: data.user.first_name || '',
    alert_title: Alert.getTitle(data.alert),
    // sender_name: Resolved by async.auto
    listing_count: data.count || 0,
    bedroom_count: data.alert.minimum_bedrooms || '0',
    bathroom_count: data.alert.minimum_bathrooms || '0',
    square_meters: Listing.getSquareFeet(data.alert.minimum_square_meters) || '',
    status: statuses.join(', '),
    // alert_uri: Resolved by async.auto
    listing_uri: config.webapp.base_url,
    subject: '[Rechat] ' + data.room.proposed_title,
    mls_terms: config.webapp.base_url + '/terms/mls',
    url: data.url || config.webapp.base_url,
    _title: '',
    room_id:data.room.id
  };

  switch(transport) {
    case 'sms':
      job_data.to = data.user.phone_number;
      job_data.from = config.twilio.from;
      break;
  }

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
    branch: cb => {
      var desktop_url = data.room.id ?
            config.webapp.base_url + '/dashboard/mls/alerts/' + data.alert.id + '&token=' + encodeURIComponent(data.token) :
            data.url;

      var b = {};
      if(data.room.id)
        b.room = data.room.id;
      b.alert = data.alert.id;
      b.sending_user = data.sender;
      b.receiving_user = data.user.id;
      b.action = 'RedirectToAlert';
      b.transport = transport;
      b['$desktop_url'] = desktop_url;
      b['$fallback_url'] = desktop_url;
      b.token = data.token;

      switch(transport) {
        case 'sms':
          b.phone_number = data.user.phone_number;
          break;
      }

      Branch.createURL(b, (err, link) => {
        if(err)
          return cb(err);

        job_data.alert_uri = link;

        return cb();
      });
    },
    send: [
      'sender',
      'office',
      'branch',
      (cb, results) => {
        transports[transport](job_data, cb);
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

var formatPrice = function(string) {
  return numeral(string).format('($0a)');
};

var formatSize = function(square_meters) {
  return numeral(Listing.getSquareFeet(square_meters)).format('0,0')+'ft²';
}

var status_groups = {
  'Active' : 'Active',
  'Sold' : 'Sold',
  'Leased' : 'Sold',
  'Pending' : 'Pending',
  'Temp Off Market' : 'Pending',
  'Active Option Contract':'Pending',
  'Active Contingent':'Pending',
  'Active Kick Out' : 'Pending',
  'Withdrawn':'Off Market',
  'Expired':'Off Market',
  'Cancelled':'Off Market',
  'Withdrawn Sublisting' : 'Off Market',
  'Incomplete' : 'Off Market',
  'Out Of Sync' : 'Off Market',
  'Incoming' : 'Off Market'
};

Alert.proposeTitle = function(alert) {
  var features = [];

  var statuses = new Set;
  alert.listing_statuses.forEach( state => statuses.add(status_groups[state]) );

  features.push( Array.from(statuses).join(',') )

  var hasmin = alert.minimum_price > 0;
  var hasmax = alert.maximum_price > 0;

  var price = '';

  if(hasmin || hasmax) {
    if(hasmin > 0)
      price += formatPrice(alert.minimum_price);

    if(hasmin && hasmax)
      price += '-';

    if(hasmin && !hasmax)
      price += '+';

    if(!hasmin && hasmax)
      price += '-';

    if(hasmax)
      price += formatPrice(alert.maximum_price);
  }

  if(price)
    features.push(price);

  var area = '';

  var hasmin = alert.minimum_square_meters > 0;
  var hasmax = alert.maximum_square_meters > 0;

  if(hasmin || hasmax) {
    if(hasmin > 0)
      area += formatSize(alert.minimum_square_meters);

    if(hasmin && hasmax)  // Min-Max
      area += '-';

    if(hasmin && !hasmax) // Min+
      area += '+';

    if(!hasmin && hasmax) // -Max
      area += '-';

    if(hasmax)
      area += formatSize(alert.maximum_square_meters);
  }

  if(area)
    features.push(area);

  if(alert.minimum_bedrooms > 0)
    features.push(alert.minimum_bedrooms + '+ Beds')


  if(alert.minimum_bathrooms > 0)
    features.push(alert.minimum_bathrooms + '+ Baths')

  if(features.length < 3 && !price)
    features.push('Any $')

  if(features.length < 3 && !alert.minimum_bedrooms)
    features.push('Any beds')

  if(features.length < 3 && !alert.minimum_bathrooms)
    features.push('Any baths')

  if(features.length < 4)
    return features.join(', ');

  return features.slice(0,3).join(', ') + ' ...'
}

Alert.getTitle = function(alert) {
  if(alert.title)
    return alert.title;

  return Alert.proposeTitle(alert);
};

Alert.associations = {
  users: {
    collection:true,
    model:'User',
    ids: (a, cb) => {
      Room.getUsersIDs(a.room, cb);
    }
  },

  created_by: {
    optional: true,
    model: 'User'
  },

  mls_areas: {
    ids: (a, cb) => {
      if(!a.mls_areas)
        return cb();

      var areas = {};
      a.mls_areas.forEach( pair => {
        // [number, parent]
        areas[pair[0]+'_'+pair[1]] = pair;

        if(pair[1] > 0) {// [number, 0]
          areas[pair[1]+'_'+0] = [pair[1], 0];
        }
      })

      cb(null, Object.keys(areas).map(k => areas[k]));
    },
    model:'MLSArea',
    collection:true
  }
};

module.exports = function() {

};
