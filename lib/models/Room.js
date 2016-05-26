/**
 * @namespace Room
 */

var _u           = require('underscore');
var async        = require('async');
var EventEmitter = require('events').EventEmitter;
var db           = require('../utils/db.js');
var validator    = require('../utils/validator.js');
var sql          = require('../utils/require_sql.js');

Room = new EventEmitter;

/**
 * * `Buyer`
 * * `Seller`
 * @typedef client_type
 * @type {string}
 * @memberof Room
 * @instance
 * @enum {string}
 */

/**
 * * `New`
 * * `Searching`
 * * `Touring`
 * * `OnHold`
 * * `Closing`
 * * `ClosedCanceled`
 * * `ClosedSuccess`
 * * `Archived`
 * @typedef room_status
 * @type {string}
 * @memberof Room
 * @instance
 * @enum {string}
 */

/**
 * * `Group`
 * * `Direct`
 * @typedef room_type
 * @type {string}
 * @memberof Room
 * @instance
 * @enum {string}
 */

/**
 * @typedef room
 * @type {object}
 * @memberof Room
 * @instance
 * @property {uuid} id - ID of this `room`
 * @property {string} title - Room title.
 * @property {Room#client_type} client_type - Type indicating the purpose of this room.
 * @property {Room#room_status=} status - Status of this room.
 * @property {Room#room_type} room_type - Type of this room, that's either `Direct` or `Group`.
 * @property {User#user=} owner - Owner of this room.
 * @property {User#user=} lead_agent - Leading agent associated with this room.
 * @property {User#user[]} users - List of all the members of this room.
 * @property {number} user_code - Automatically generated `user` code. We use this code to give users the ability to easily connect with each other.
 * @property {timestamp} created_at - Indicates when this object was created.
 * @property {timestamp=} updated_at - Indicates when this object was last modified.
 * @property {timestamp=} deleted_at - Indicates when this object was deleted.
 */

/**
 * External information on a listing
 * @typedef external_info
 * @type {object}
 * @memberof Room
 * @instance
 * @property {uuid} ref_object_id - Referencing object ID. This is usually the ID of an alert causing
 * this recommendation to surface, but also can be the user manually recommending this listing.
 * @property {string} source - Overrides the source of this listing. The default value is `MLS`
 * @property {string} source_url - Overrides the source url of this listing. This is usually the webpage that a user invokes our chrome-extension
 * on to recommend a listing manually.
 */

var schema = {
  type: 'object',
  properties: {
    client_type: {
      type: 'string',
      required: true,
      enum: [ 'Buyer', 'Seller', 'Unknown' ]
    },

    title: {
      type: 'string',
      required: false
    },

    owner: {
      type: 'string',
      uuid: true,
      required: false
    },

    status: {
      type: 'string',
      enum: ['New', 'Searching', 'Touring', 'OnHold', 'Closing', 'ClosedCanceled', 'ClosedSuccess', 'Archived'],
      required: false
    },

    room_type: {
      type: 'string',
      required: true,
      enum: [ 'Group', 'Direct', 'Personal' ]
    }
  }
};

var validate = validator.bind(null, schema);

// SQL queries to work with Room object
var sql_insert                 = require('../sql/room/insert.sql');
var sql_get                    = require('../sql/room/get.sql');
var sql_update                 = require('../sql/room/update.sql');
var sql_delete                 = require('../sql/room/delete.sql');
var sql_archive                = require('../sql/room/archive.sql');
var sql_unarchive              = require('../sql/room/unarchive.sql');
var sql_lookup                 = require('../sql/room/lookup.sql');
var sql_search                 = require('../sql/room/search.sql');
var sql_delete_recommendations = require('../sql/room/delete_recommendations.sql');
var sql_delete_invitations     = require('../sql/room/delete_invitations.sql');
var sql_delete_notifications   = require('../sql/room/delete_notifications.sql');
var sql_delete_alerts          = require('../sql/room/delete_alerts.sql');
var sql_delete_messages        = require('../sql/room/delete_messages.sql');
var sql_user_rooms             = require('../sql/room/user_rooms.sql');
var sql_add_user               = require('../sql/room/add_user.sql');
var sql_get_users              = require('../sql/room/get_users.sql');
var sql_others                 = require('../sql/room/others.sql');
var sql_dup                    = require('../sql/room/dup.sql');
var sql_new_counts             = require('../sql/room/new_counts.sql');
var sql_is_member              = require('../sql/room/is_member.sql');
var sql_update_lead_agent      = require('../sql/room/update_lead_agent.sql');
var sql_hide_orphaned_recs     = require('../sql/room/hide_orphaned_recs.sql');
var sql_leave                  = require('../sql/room/leave.sql');
var sql_leave_all              = require('../sql/room/leave_all.sql');
var sql_media                  = require('../sql/room/media.sql');
var sql_toggle_push_settings   = require('../sql/room/toggle_push_settings.sql');
var sql_ok_push                = require('../sql/room/ok_push.sql');

/**
 * Inserts a `room` object into database
 * @memberof Room
 * @instance
 * @public
 * @param {room} room - full room object
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the room created
 */
function insert(room, cb) {
  db.query(sql_insert, [
    room.room_type,
    room.client_type,
    room.title,
    room.owner
  ], function(err, res) {
       if(err)
         return cb(err);

       return cb(null, res.rows[0].id);
     });
}

/**
 * Adds a `user` to a `room`
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} user_id - ID of the user being added
 * @param {uuid} room_id - ID of the room the user being added to
 */
function add_user(user_id, room_id, cb) {
  db.query(sql_add_user, [user_id, room_id], function(err, res) {
    if(err) {
      if (err.code === '23505') {
        return cb(Error.Conflict());
      } else {
        return cb(err);
      }
    } else {
      return cb();
    }
  });
}

function listing_notification(listing, room, user, recommendation_id, external_info, cb) {
  var address_line = Address.getLocalized(listing.property.address);
  var notification = {};

  if (external_info.notification == 'Hit') {
    notification.subject = listing.id;
    notification.subject_class = 'Listing';
    notification.object = room.id;
    notification.object_class = 'Room';
    notification.auxiliary_subject = (external_info.ref_alert_id) ?
      external_info.ref_alert_id : external_info.ref_user_id;
    notification.auxiliary_subject_class = (external_info.ref_alert_id) ?
      'Alert' : 'User';
    notification.recommendation = recommendation_id;
    notification.room = room.id;
    notification.action = 'BecameAvailable';
    notification.message = '#' + room.title + ': ' + address_line + ' just hit the market';

    console.log('↯'.cyan, 'Recommending Listing with MUI:',
                ('#' + listing.matrix_unique_id).red,
                '('.cyan, listing.id.yellow, ')'.cyan,
                '*'.blue, address_line, '*'.blue,
                'MLS#:'.white, listing.mls_number.yellow,
                'to Room #', room.title.magenta,
                'with ID:'.cyan, room.id.yellow,
                'invoked by', notification.auxiliary_subject_class,
                'with ID:'.cyan, notification.auxiliary_subject.red);
    return Notification.issueForRoom(notification, cb);
  } else if (external_info.notification == 'Share') {
    notification.subject = user.id;
    notification.subject_class = 'User';
    notification.object = listing.id;
    notification.object_class = 'Listing';
    notification.recommendation = recommendation_id;
    notification.room = room.id;
    notification.action = 'Shared';
    notification.message = '#' + room.title + ': ' + '@' + user.first_name + ' shared ' + address_line;

    console.log('↵'.cyan, 'User', user.first_name.magenta, user.last_name.magenta, 'with ID:', user.id.yellow,
                'Shared a Listing with MUI:',
                ('#' + listing.matrix_unique_id).red,
                '('.cyan, listing.id.yellow, ')'.cyan,
                '*'.blue, address_line, '*'.blue,
                'MLS#:'.white, listing.mls_number.yellow,
                'with Room #', (room.title) ? room.title.magenta : 'N/A'.magenta,
                'ID:', room.id.yellow.cyan);
    return Notification.issueForRoomExcept(notification, user.id, cb);
  } else {
    return cb();
  }
}

/**
 * Retrieves a full `room` object
 * @name get
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the room being retrieved
 * @param {callback} cb - callback function
 * @returns {Room#room} corresponding room object
 */
Room.get = function(room_id, cb) {
  db.query(sql_get, [room_id], function(err, res) {
    if(err) {
      return cb(err);
    }

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound('Room not found'));

    var room = res.rows[0];
    cb(null, room);
  });
};

/**
 * Creates a `room`
 * @name create
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {Room#room} room - full room object
 * @param {callback} cb - callback function
 * @returns {Room#room} corresponding room object
 */
Room.create = function(room, cb) {
  async.auto({
    validate: function(cb) {
      validate(room, cb);
    },
    user: function(cb) {
      if(room.owner)
        return User.get(room.owner, cb);
      else
        return cb();
    },
    insert: [
      'validate',
      'user',
      (cb, results) => {
        insert(room, cb);
      }
    ],
    add_owner: [
      'validate',
      'user',
      'insert',
      (cb, results) => {
        if(room.owner)
          return Room.addUser(room.owner, results.insert, cb);
        else
          return cb();
      }
    ],
    add_users: [
      'validate',
      'user',
      'insert',
      'add_owner',
      (cb, results) => {
        async.map(room.users, function(r, cb) {
          return Room.addUser(r, results.insert, cb);
        }, function(err) {
          if(err)
            return cb(err);

          return cb();
        });
      }
    ],
    room: [
      'validate',
      'user',
      'insert',
      'add_owner',
      'add_users',
      (cb, results) => {
        Room.get(results.insert, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, results.room);
  });
};

/**
 * Updates a `room` after validating the whole object
 * @name update
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {Room#room} room - partial room object
 * @param {callback} cb - callback function
 * @returns {Room#room} corresponding room object
 */
Room.update = function(room_id, room, cb) {
  validate(room, function(err) {
    if(err)
      return cb(err);

    Room.get(room_id, function(err, data) {
      if(err)
        return cb(err);

      db.query(sql_update, [
        room.client_type,
        room.title,
        room.owner,
        room.status,
        room.lead_agent,
        room_id
      ], function(err, res) {
           if(err)
             return cb(err);

           Room.get(room_id, function(err, room) {
             if(err)
               return cb(err);

             return cb(null, room);
           });
         });
    });
  });
};

/**
 * Patches a `room` object with new parameters
 * @name patch
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {Room#room} room - full room object
 * @param {callback} cb - callback function
 * @returns {Room#room} corresponding room object
 */
Room.patch = function(room_id, room, cb) {
  Room.get(room_id, function(err, data) {
    if(err)
      return cb(err);

    if (data.owner)
      data.owner = data.owner.id;
    if (data.lead_agent)
      data.lead_agent = data.lead_agent.id;

    for(var i in room)
      data[i] = room[i];

    Room.update(room_id, data, function(err, res) {
      if(err)
        return cb(err);

      Room.get(room_id, function(err, room) {
        if(err)
          return cb(err);

        return cb(null, room);
      });
    });
  });
};

/**
 * Deletes a `room` object
 * @name delete
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 */
Room.delete = function(room_id, cb) {
  async.series({
    get: function(cb) {
      Room.get(room_id, cb);
    },
    delete_recommendations: function(cb) {
      Room.deleteRecommendations(room_id, cb);
    },
    delete_invitations: function(cb) {
      Room.deleteInvitations(room_id, cb);
    },
    delete_notifications: function(cb) {
      Room.deleteNotifications(room_id, cb);
    },
    delete_users: function(cb) {
      Room.removeUsers(room_id, cb);
    },
    delete_alerts: function(cb) {
      Room.deleteAlerts(room_id, cb);
    },
    delete_object: function(cb) {
      Room.deleteObject(room_id, cb);
    }
  }, function(err, results) {
    if(err)
      return cb(err);

    return cb(null, results.get);
  });
};

/**
 * Retrieves all `room` objects that a particular user is a member of
 * @name getUserRooms
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {pagination} paging - pagination parameters
 * @param {callback} cb - callback function
 * @returns {Room#room[]} collection of rooms
 */
Room.getUserRooms = function(user_id, paging, cb) {
  db.query(sql_user_rooms, [user_id, paging.type, paging.timestamp, paging.limit, paging.room_type], (err, res) => {
    if(err)
      return cb(err);

    var room_ids = res.rows.map(r => {
                     return r.id;
                   });

    async.map(room_ids, Room.get, (err, rooms) => {
      if(err)
        return cb(err);

      if (res.rows.length > 0)
        rooms[0].total = res.rows[0].total;

      return cb(null, rooms);
    });
  });
};

/**
 * Retrievs all the members of a `room`
 * @name getUsers
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {User#user[]} collection of room members
 */
Room.getUsers = function(room_id, cb) {
  Room.getUsersIDs(room_id, function(err, user_ids) {
    if(err)
      return cb(err);

    async.map(user_ids, User.get, function(err, users) {
      if(err)
        return cb(err);

      return cb(null, users);
    });
  });
};

/**
 * Retrievs IDs of all the members of a `room`
 * @name getUsersIDs
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {uuid[]} collection of room members UUIDs
 */
Room.getUsersIDs = function(room_id, cb) {
  db.query(sql_get_users, [room_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, false);

    var user_ids = res.rows.map(function(r) {
                     return r.id;
                   });

    return cb(null, user_ids);
  });
};

/**
 * Deletes all `Users` from this `room`
 * @name deleteUsers
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 */
Room.removeUsers = function(room_id, cb) {
  db.query(sql_leave_all, [room_id], cb);
};

/**
 * Deletes all `Messages` posted to this `room`
 * @name deleteMessages
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 */
Room.deleteMessages = function(room_id, cb) {
  db.query(sql_delete_messages, [room_id], cb);
};

/**
 * Deletes all `Invitations` sent for this `room`
 * @name deleteInvitations
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 */
Room.deleteInvitations = function(room_id, cb) {
  db.query(sql_delete_invitations, [room_id], cb);
};

/**
 * Deletes all `Recommendations` generated for this `room`
 * @name deleteRecommendations
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 */
Room.deleteRecommendations = function(room_id, cb) {
  db.query(sql_delete_recommendations, [room_id], cb);
};

/**
 * Deletes all `Notifications` generated for this `room`
 * @name deleteNotifications
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 */
Room.deleteNotifications = function(room_id, cb) {
  db.query(sql_delete_notifications, [room_id], cb);
};

/**
 * Deletes all `Alerts` created for this `room`
 * @name deleteAlerts
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 */
Room.deleteAlerts = function(room_id, cb) {
  db.query(sql_delete_alerts, [room_id], cb);
};

/**
 * Deletes this `room` object
 * @name deleteObject
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 */
Room.deleteObject = function(room_id, cb) {
  db.query(sql_delete, [room_id], cb);
};

/**
 * Checks whether a `user` is a member of this `room`
 * @name isMember
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.isMember = function(user_id, room_id, cb) {
  db.query(sql_is_member, [room_id, user_id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, (res.rows[0].is_member >= 1) ? true : false);
  });
};

/**
 * Adds a `user` to this `room`
 * @name addUser
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.addUser = function(user_id, room_id, cb) {
  async.auto({
    user: function(cb) {
      User.get(user_id, cb);
    },
    room: function(cb) {
      Room.get(room_id, cb);
    },
    others: [
      'user',
      'room',
      cb => {
        Room.others(room_id, user_id, cb);
      }
    ],
    add_user: [
      'user',
      'room',
      cb => {
        add_user(user_id, room_id, cb);
      }
    ],
    lead_agent: [
      'user',
      'room',
      (cb, results) => {
        if(!results.room.lead_agent && results.user.user_type == 'Agent') {
          return Room.updateLeadAgent(room_id, user_id, cb);
        } else {
          return cb();
        }
      }
    ],
    connect: [
      'user',
      'room',
      'others',
      'add_user',
      (cb, results) => {
        async.map(results.others, function(r, cb) {
          Contact.connect(user_id, r, cb);
        }, cb);
      }
    ],
    notification: [
      'user',
      'room',
      (cb, results) => {
        Room.emit('user added', {
          user: results.user,
          room: results.room
        });

        var notification = {};
        notification.action = 'Joined';
        notification.subject = user_id;
        notification.subject_class = 'User';
        notification.object = room_id;
        notification.object_class = 'Room';
        notification.message = '#' + results.room.title + ': @' + results.user.first_name + ' just joined';
        notification.room = room_id;

        return Notification.issueForRoomExcept(notification, user_id, cb);
      }
    ]
  }, cb);
};

/**
 * Creates a `room` of type `Direct` between two users
 * @name createPrivateMessage
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} user_id - ID of the referenced user
 * @param {uuid} peer_id - ID of the second referenced user
 * @param {callback} cb - callback function
 * @returns {uuid} ID of the created room
 */
Room.createPrivateMessage = function(user_id, peer_id, cb) {
  var room = {};
  room.room_type = 'Direct';
  room.users = [ user_id, peer_id ];

  Room.create(room, function(err, room) {
    if(err)
      return cb(err);

    return cb(null, room.id);
  });
};

/**
 * Returns a list of IDs for all the users in a `room` except for the referenced user
 * @name others
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {uuid[]} A collection of IDs
 */
Room.others = function(room_id, user_id, cb) {
  Room.get(room_id, function(err, room) {
    if(err)
      return cb(err);

    db.query(sql_others, [room_id, user_id], function(err, res) {
      if(err)
        return cb(err);

      var others_ids = res.rows.map(function(r) {
                         return r.user;
                       });

      return cb(null, others_ids);
    });
  });
};

/**
 * Returns a list of IDs for all the users in a `room` except for the referenced user
 * @name hideOrphanedRecommendations
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.hideOrphanedRecommendations = function(room_id, cb) {
  db.query(sql_hide_orphaned_recs, [room_id], cb);
};

/**
 * Returns a list of IDs for all the users in a `room` except for the referenced user
 * @name isDup
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} listing_id - ID of the referenced listing
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.isDup = function(room_id, listing_id, cb) {
  db.query(sql_dup, [room_id, listing_id], function(err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(null, false);
    else
      return cb(null, res.rows[0].id);
  });
};

/**
 * Recommends a `Listing` to the specified `room`. We expect `ref_object_id` be present
 * in the external_info object as a mandatory field. This method automatically adds invoking
 * alert to the list of referring_objects.
 * @name recommendListing
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} listing_id - ID of the referenced listing
 * @param {external_info} external_info - external information on a listing object
 * @param {callback} cb - callback function
 * @returns {Recommendation#recommendation}
 */
Room.recommendListing = function(room_id, listing_id, external_info, cb) {
  if (!(external_info.ref_alert_id || external_info.ref_user_id))
    return cb(Error.Validation('No referencing object mentioned'));

  if(external_info.ref_user_id && (external_info.notification != 'Share' &&
                                   external_info.notification != 'None' &&
                                   external_info.notification != undefined))
    return cb(Error.Validation('User is a reference, but notification type indicates otherwise'));

  if(external_info.ref_alert_id && (external_info.notification != 'Hit' &&
                                    external_info.notification != 'None' &&
                                    external_info.notification != undefined))
    return cb(Error.Validation('Alert is a reference, but notification type indicates otherwise'));

  var ref_id = external_info.ref_alert_id || external_info.ref_user_id;

  Room.get(room_id, (err, room) => {
    if(err)
      return cb(err);

    Listing.get(listing_id, (err, listing) => {
      if(err)
        return cb(err);

      Room.isDup(room_id, listing_id, (err, dup) => {
        if(err)
          return cb(err);

        if (dup) {
          async.auto({
            add_reference_to_recommendation: cb => {
              Recommendation.addReferenceToRecommendations(room_id, listing_id, ref_id, cb);
            },
            user: cb => {
              if(!external_info.ref_user_id)
                return cb();

              return User.get(external_info.ref_user_id, cb);
            },
            unhide_recommendation: [
              'add_reference_to_recommendation',
              cb => {
                Recommendation.unhide(dup, cb);
              }
            ],
            recommendation: [
              'add_reference_to_recommendation',
              'unhide_recommendation',
              (cb) => {
                Recommendation.get(dup, cb);
              }
            ],
            notifications: [
              'add_reference_to_recommendation',
              'user',
              'unhide_recommendation',
              (cb, results) => {
                if(external_info.notification == 'Share')
                  listing_notification(listing, room, results.user, dup, external_info, cb);
                else
                  return cb();
              }
            ]
          }, (err, results) => {
            if(err)
              return cb(err);

            return cb(null, results.recommendation);
          });
        } else {
          var recommendation = {};

          recommendation.source = external_info.source || 'MLS';
          recommendation.source_url = external_info.source_url || 'http://www.ntreis.net/';
          recommendation.room = room_id;
          recommendation.referring_objects = '{' + ref_id + '}';
          recommendation.listing = listing_id;
          recommendation.recommendation_type = 'Listing';
          recommendation.matrix_unique_id = listing.matrix_unique_id;

          async.auto({
            insert: cb => {
              return Recommendation.create(recommendation, cb);
            },
            user: cb => {
              if(!external_info.ref_user_id)
                return cb();

              return User.get(external_info.ref_user_id, cb);
            },
            recommendation: [
              'insert',
              (cb, results) => {
                return Recommendation.get(results.insert, cb);
              }
            ],
            notifications: [
              'user',
              'insert',
              (cb, results) => {
                listing_notification(listing, room, results.user, results.insert, external_info, cb);
              }
            ]
          }, (err, results) => {
            if(err)
              return cb(err);

            return cb(null, results.recommendation);
          });
        }
      });
    });
  });
}

Room.recommendListings = function(room_id, listing_ids, external_info, cb) {
  if(!(external_info.ref_alert_id || external_info.ref_user_id))
    return cb(Error.Validation('No referencing object mentioned'));

  if(external_info.ref_user_id && (external_info.notification != 'Share' &&
                                   external_info.notification != 'None' &&
                                   external_info.notification != undefined))
    return cb(Error.Validation('User is a reference, but notification type indicates otherwise'));

  if(external_info.ref_alert_id && (external_info.notification != 'Hit' &&
                                    external_info.notification != 'None' &&
                                    external_info.notification != undefined))
    return cb(Error.Validation('Alert is a reference, but notification type indicates otherwise'));

  var ref_id = external_info.ref_alert_id || external_info.ref_user_id;

  Room.get(room_id, (err, room) => {
    var processListing = (listing_id, cb) => {
      Listing.get(listing_id, (err, listing) => {
        if(err)
          return cb(err);

        Room.isDup(room_id, listing_id, (err, dup) => {
          if(err)
            return cb(err);

          if (dup) {
            async.series([
              Recommendation.addReferenceToRecommendations.bind(null, room_id, listing_id, ref_id),
              Recommendation.unhide.bind(null, dup),
            ], cb);
          } else {
            var recommendation = {};

            recommendation.source = external_info.source || 'MLS';
            recommendation.source_url = external_info.source_url || 'http://www.ntreis.net/';
            recommendation.room = room_id;
            recommendation.referring_objects = '{' + ref_id + '}';
            recommendation.listing = listing_id;
            recommendation.recommendation_type = 'Listing';
            recommendation.matrix_unique_id = listing.matrix_unique_id;

            async.auto({
              insert: cb => {
                return Recommendation.create(recommendation, cb);
              },
              user: cb => {
                if(!external_info.ref_user_id)
                  return cb();

                return User.get(external_info.ref_user_id, cb);
              },
              notifications: [
                'user',
                'insert',
                (cb, results) => {
                  listing_notification(listing, room, results.user, results.insert, external_info, cb);
                }
              ]
            }, (err, results) => {
              if(err)
                return cb(err);

              return cb(null, results.recommendation);
            });
          }
        });
      });
    }

    async.each(listing_ids, processListing, cb);
  });
};

/**
 * Archives a `room` so that it no longer receives MLS updates, notifications or any other activity.
 * Once a `room` is archived, it won't be accessible anymore.
 * @name archive
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.archive = function(room_id, cb) {
  db.query(sql_archive, [room_id], cb);
};

/**
 * Unarchives a `room` so that it no longer receives MLS updates, notifications or any other activity.
 * Once a `room` is archived, it won't be accessible anymore.
 * @name archive
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.unarchive = function(room_id, cb) {
  db.query(sql_unarchive, [room_id], cb);
};

/**
 * Each `room` is associated with a leading agent. This method updates
 * that leading agent.
 * @name updateLeadAgent
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} agent_id - ID of the referenced agent
 * @param {callback} cb - callback function
 */
Room.updateLeadAgent = function(room_id, agent_id, cb) {
  db.query(sql_update_lead_agent, [room_id, agent_id], function(err, res) {
    if(err)
      return cb(err);

    return cb();
  });
};

/**
 * Strips unwanted information from a `room` object
 * that leading agent.
 * @name getNewCounts
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {Room#new_counts}
 */
Room.getNewCounts = function(room_id, user_id, cb) {
  db.query(sql_new_counts, [room_id, user_id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, res.rows[0]);
  });
};

/**
 * Personalized response for `room` object for a specified user
 * @name getForUser
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {Room#room}
 */
Room.getForUser = function(room_id, user_id, cb) {
  Room.get(room_id, function(err, room) {
    if(err)
      return cb(err);

    Room.getNewCounts(room_id, user_id, function(err, counts) {
      if(err)
        return cb(err);

      return cb(null, room);
    });
  });
};

/**
 * Removes user from a `room`
 * @name removeUser
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.removeUser = function(room_id, user_id, cb) {
  db.query(sql_leave, [room_id, user_id], cb);
};

/**
 * Retrieves messages with different media types (photos, videos, documents, etc) from a `room`
 * @name getMedia
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {pagination} paging - pagination parameters
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.getMedia = function(room_id, paging, cb) {
  Room.get(room_id, function(err, room) {
    if(err)
      return cb(err);

    db.query(sql_media, [room_id, paging.type, paging.timestamp, paging.limit], function(err, res) {
      if(err)
        return cb(err);

      var message_ids = res.rows.map(function(r) {
                          return r.id;
                        });

      async.map(message_ids, Message.get, function(err, messages) {
        if(err)
          return cb(err);

        return cb(null, messages);
      });
    });
  });
};

Room.setPushSettings = function(user_id, room_id, enable, cb) {
  db.query(sql_toggle_push_settings, [user_id, room_id, enable], function(err, res) {
    if(err)
      return cb(err);

    return cb();
  });
};

Room.isPushOK = function(user_id, room_id, cb) {
  db.query(sql_ok_push, [user_id, room_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, true);

    return cb(null, res.rows[0].ok);
  });
};

Room.belongs = function(members, user) {
  var member_ids = members.map(function(r) {
                     return r.id;
                   });

  if (!user || (member_ids.indexOf(user) != -1))
    return true;
  else
    return false;
};

Room.search = function(user, include, cb) {
  var _include = '{' + include.join(',') + '}';

  db.query(sql_lookup, [user, _include], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var room_ids = res.rows.map(function(r) {
      return r.id;
    });

    async.map(room_ids, Room.get, function(err, rooms) {
      if(err)
        return cb(err);

      return cb(null, rooms);
    });
  });
};

Room.stringSearch = function(user, terms, types, cb) {
  db.query(sql_search, [user, types], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var room_ids = res.rows.map(function(r) {
      if (Room.arrayMatch(r.first_names, terms) ||
          Room.arrayMatch(r.last_names, terms) ||
          Room.arrayMatch(r.phone_numbers, terms) ||
          Room.arrayMatch(r.emails, terms) ||
          Room.arrayMatch([r.title], terms))
        return r.id;
    }).filter(Boolean);

    async.map(room_ids, Room.get, function(err, rooms) {
      if(err)
        return cb(err);

      return cb(null, rooms);
    });
  });
}

Room.arrayMatch = function(array, terms) {
  array = array.filter(Boolean);

  for (var i in array) {
    for (var j in terms) {
      var r = new RegExp(terms[j], 'i');
      var t = array[i].match(r);
      if(t != null)
        return true;
    }
  }

  return false;
};

Room.bulkCreateWithUsers = function(user, users, override, cb) {
  var room = {
    client_type: 'Unknown',
    room_type: 'Group',
    owner: user,
    title: override.title || undefined
  };

  async.map(users, function(r, cb) {
    var clone = _u.clone(room);
    clone.users = [r];

    async.auto({
      room: function(cb) {
        Room.create(clone, cb);
      }
    }, function(err, results) {
      if(err)
        return cb(err);

      return cb(null, results.room.id);
    });
  }, cb);
};

Room.bulkSendMessage = function(user, rooms, message, cb) {
  message.author = user;

  async.map(rooms, function(r, cb) {
    Message.post(r, message, true, cb);
  }, cb);
};

Room.associations = {
  owner: {
    optional: true,
    model: 'User'
  },

  users: {
    collection: true,
    ids: (r, cb) => Room.getUsersIDs(r.id, cb),
    model: 'User'
  },

  lead_agent: {
    optional: true,
    model: 'User'
  },

  latest_message: {
    optional: true,
    model: 'Message'
  }
}

module.exports = function() {};
