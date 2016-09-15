/**
 * @namespace Room
 */

var _u           = require('underscore');
var async        = require('async');
var EventEmitter = require('events').EventEmitter;
var db           = require('../utils/db.js');
var validator    = require('../utils/validator.js');
var sql          = require('../utils/require_sql.js');
var config       = require('../config.js');

Room = new EventEmitter;

Orm.register('room', Room);

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
    },

    users: {
      type: 'array',
      required: false,
      minItems: 0,
      items: {
        type: 'string',
        uuid: true
      }
    },

    phone_numbers: {
      type: 'array',
      required: false,
      minItems: 0,
      items: {
        type: 'string',
        phone: true
      }
    },

    emails: {
      type: 'array',
      required: false,
      minItems: 0,
      items: {
        type: 'string',
        email: true
      }
    }
  }
};

var validate = validator.bind(null, schema);

// SQL queries to work with Room object
var sql_insert                 = require('../sql/room/insert.sql');
var sql_get                    = require('../sql/room/get.sql');
var sql_update                 = require('../sql/room/update.sql');
var sql_delete                 = require('../sql/room/delete.sql');
var sql_search_users           = require('../sql/room/search_users.sql');
var sql_search_users_29        = require('../sql/room/search_users_29.sql');
var sql_string_search          = require('../sql/room/string_search.sql');
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

  if (external_info.notification === 'Hit') {
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
                'to Room #', room.title ? room.title.magenta : 'Untitled'.magenta,
                'with ID:'.cyan, room.id.yellow,
                'invoked by', notification.auxiliary_subject_class,
                'with ID:'.cyan, notification.auxiliary_subject.red
               );

    return Notification.issueForRoom(notification, cb);
  } else if (external_info.notification === 'Share') {
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
                'with Room #', (room.title) ? room.title.magenta : 'Untitled'.magenta,
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
    return cb(null, room);
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
          return Room.addUser(room.owner, results.insert, false, cb);
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
          return Room.addUser(r, results.insert, false, cb);
        }, err => {
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

// 2.10
// Room.compose = function(room, cb) {
//   async.auto({
//     email_shadows: (cb, results) => {
//       return async.map(room.emails, (r, cb) => {
//         User.getOrCreateByEmail(r, (err, user) => {
//           if(err)
//             return cb(err);

//           return cb(null, user.id);
//         });
//       }, cb);
//     },
//     phone_shadows: (cb, results) => {
//       return async.map(room.phone_numbers, (r, cb) => {
//         User.getOrCreateByPhoneNumber(r, (err, user) => {
//           if(err)
//             return cb(err);

//           return cb(null, user.id);
//         });
//       }, cb);
//     }
//   }, (err, results) => {
//     if(err)
//       return cb(err);

//     var e = results.email_shadows || [];
//     var p = results.phone_shadows || [];
//     var u = room.users || [];
//     var self = room.owner || null;

//     var users = _u.unique(u.concat(e).concat(p).concat(self).filter(Boolean));
//     if(users.length === 2)
//       return User.getOrCreateDirectRoom(users[0], users[1], cb);
//     else {
//       room.users = _u.without(users, self);

//       return Room.create(room, cb);
//     }
//   });
// };

// 2.9
Room.compose = function(room, cb) {
  async.auto({
    classify_phones: cb => {
      User.classifyPhoneNumbers(room.phone_numbers, cb);
    },
    email_shadows: (cb, results) => {
      return async.map(room.emails, (r, cb) => {
        User.getOrCreateByEmail(r, (err, user) => {
          if(err)
            return cb(err);

          return cb(null, user.id);
        });
      }, cb);
    },
    create: [
      'classify_phones',
      'email_shadows',
      (cb, results) => {
        var e = results.email_shadows || [];
        var p = results.classify_phones.existing.ids || [];
        var u = room.users || [];
        var self = room.owner || null;

        var users = _u.unique(u.concat(e).concat(p).concat(self).filter(Boolean));
        var should_create_direct = (users.length === 2) && (_u.isEmpty(results.classify_phones.non_existing));
        if(should_create_direct)
          return User.getOrCreateDirectRoom(users[0], users[1], cb);
        else {
          room.users = _u.without(users, self);

          return Room.create(room, cb);
        }
      }
    ],
    phone_non_existing: [
      'classify_phones',
      'create',
      (cb, results) => {
        return async.map(results.classify_phones.non_existing, (r, cb) => {
          var invitation = {
            inviting_user: room.owner,
            phone_number: r,
            room: results.create.id
          };

          return Invitation.create(invitation, cb);
        }, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, results.create);
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
  async.auto({
    validate: cb => {
      return validate(room, cb);
    },
    constraints: cb => {
      if(room.room_type === 'Direct')
        return cb(Error.Validation('Cannot manually create a private room'));

      return cb();
    },
    get: cb => {
      return Room.get(room_id, cb);
    },
    update: [
      'validate',
      'constraints',
      'get',
      cb => {
        return db.query(sql_update, [
          room.client_type,
          room.title,
          room.owner,
          room.status,
          room.lead_agent,
          room.room_type,
          room_id
        ], cb);
      }
    ],
    after: [
      'update',
      cb => {
        return Room.get(room_id, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, results.after);
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
  }, (err, results) => {
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
  Room.get(room_id, (err, room) => {
    if(err)
      return cb(err);

    if(room.room_type === 'Direct' || room.room_type === 'Personal')
      return cb(Error.NotAcceptable('Cannot remove a user from a direct or personal room'));

    db.query(sql_leave_all, [room_id], cb);
  });
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
Room.addUser = function(user_id, room_id, connect_override, cb) {
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
        if(!results.room.lead_agent &&
           results.user.user_type === 'Agent' &&
           results.room.room_type != 'Direct') {
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
          Contact.connect(user_id, r, connect_override, cb);
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

        cb();
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
Room.createDirect = function(user_id, peer_id, cb) {
  var room = {};
  room.room_type = 'Direct';
  room.client_type = 'Unknown';
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
    return cb(Error.Validation('Reference is a user, but notification type indicates otherwise'));

  if(external_info.ref_alert_id && (external_info.notification != 'Hit' &&
                                    external_info.notification != 'None' &&
                                    external_info.notification != undefined))
    return cb(Error.Validation('Reference is an alert, but notification type indicates otherwise'));

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
                if(external_info.notification === 'Share')
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
};

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
  Room.get(room_id, (err, room) => {
    if(err)
      return cb(err);

    if(room.room_type === 'Personal' || room.room_type === 'Direct')
      return cb(Error.NotAcceptable('You cannot leave your personal room or a direct message'));

    User.get(user_id, (err, user) => {
      if(err)
        return cb(err);

      db.query(sql_leave, [room_id, user_id], cb);
    });
  });
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

Room.stringSearch = function(user_id, terms, limit, similarity, room_types, cb) {
  terms = terms.join('|');

  db.query(sql_string_search, [user_id, terms, limit, similarity, room_types], (err, res) => {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var room_ids = res.rows.map(r => {
      return r.id;
    });

    async.map(room_ids, Room.get, (err, rooms) => {
      if(err)
        return cb(err);

      rooms[0].total = res.rows[0].total;
      return cb(null, rooms);
    });
  });
};

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

  async.map(users, (r, cb) => {
    async.auto({
      room: cb => {
        Room.create(room, cb);
      },
      add_peer: [
        'room',
        (cb, results) => {
          Room.addUser(r, results.room.id, override.connect, cb);
        }
      ],
      message: [
        'add_peer',
        'room',
        (cb, results) => {
          if(!override.message)
            return cb();

          var message = {
            author: override.from || user,
            message_type: 'TopLevel',
            comment: override.message
          };

          return Message.post(results.room.id, message, true, cb);
        }
      ]
    }, (err, results) => {
      if(err)
        return cb(err);

      return cb(null, results.room.id);
    });
  }, cb);
};

Room.bulkSendPrivateToUsers = function(user, users, override, cb) {
  async.map(users, (r, cb) => {
    async.auto({
      room: cb => {
        User.getOrCreateDirectRoom(user, r, cb);
      },
      message: [
        'room',
        (cb, results) => {
          if(!override.message)
            return cb();

          var message = {
            author: override.from || user,
            message_type: 'TopLevel',
            comment: override.message
          };

          return Message.post(results.room.id, message, true, cb);
        }
      ]
    }, (err, results) => {
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

Room.combineUserReferences = function(users, emails, phones, cb) {
  var non_existing = false;

  async.auto({
    users: cb => {
      if(!users)
        return cb(null, []);

      async.map(users, User.get, (err, results) => {
        if(err)
          return cb(err);

        return cb(null, results.filter(Boolean));
      });
    },
    emails: cb => {
      if(!emails)
        return cb(null, []);

      async.map(emails, User.getByEmail, (err, results) => {
        if(err)
          return cb(err);

        var s = results.filter(Boolean);
        if (emails.length !== s.length)
          non_existing = true;

        return cb(null, s);
      });
    },
    phones: cb => {
      if(!phones)
        return cb(null, []);

      async.map(phones, (r, cb) => {
        var p = ObjectUtil.formatPhoneNumberForDialing(r);
        return User.getByPhoneNumber(p, cb);
      }, (err, results) => {
        if(err)
          return cb(err);

        var s = results.filter(Boolean);
        if (emails.length !== s.length)
          non_existing = true;

        return cb(null, s);
      });
    },
    check: [
      'users',
      'emails',
      'phones',
      (cb, results) => {
        var u = users ? users : [];

        var e = results.emails.map(r => {
          return r.id;
        });

        var p = results.phones.map(r => {
          return r.id;
        });

        return cb(null, {
          users: _u.unique(u.concat(e).concat(p)),
          non_existing: non_existing
        });
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, results.check);
  });
};

// 2.10
// Room.searchForUsers = function(user_id, users, cb) {
//   var all = _u.unique(users);
//   db.query(sql_search_users, [user_id, all], (err, res) => {
//     if(err)
//       return cb(err);

//     if(res.rows.length < 1)
//       return cb(null, []);

//     async.map(res.rows, (r, cb) => {
//       return Room.get(r.id, cb);
//     }, (err, results) => {
//       if(err)
//         return cb(err);

//       return cb(null, results);
//     });
//   });
// };

// 2.9
Room.searchForUsers = function(user_id, users, phones, cb) {
  var all = !_u.isEmpty(users) ? users : [];
  all = _u.unique(users.concat(user_id));
  phones = _u.unique(phones);

  db.query(sql_search_users_29, [user_id, all, phones], (err, res) => {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    async.map(res.rows, (r, cb) => {
      return Room.get(r.id, cb);
    }, (err, results) => {
      if(err)
        return cb(err);

      return cb(null, results);
    });
  });
};

// 2.10
// Room.searchForParties = function(user_id, users, emails, phones, cb) {
//   Room.combineUserReferences(users, emails, phones, (err, results) => {
//     if(err)
//       return cb(err);
//
//     if(_u.isEmpty(results.users) || results.non_existing)
//       return cb(null, []);
//
//     return Room.searchForUsers(user_id, r, cb);
//   });
// };

// 2.9
Room.searchForParties = function(user_id, users, emails, phones, cb) {
  async.auto({
    classify_phones: cb => {
      User.classifyPhoneNumbers(phones, cb);
    },
    combine: [
      'classify_phones',
      (cb, results) => {
        return Room.combineUserReferences(users, emails, results.classify_phones.existing.phones, cb);
      }
    ],
    search: [
      'classify_phones',
      'combine',
      (cb, results) => {
        console.log(results.combine);
        if(_u.isEmpty(results.combine.users) || results.combine.non_existing)
          return cb(null, []);

        return Room.searchForUsers(user_id, results.combine.users, results.classify_phones.non_existing, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, results.search);
  });
};

Room.getTitle = function(room) {
  if (room.title)
    return room.title;

  return '';
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
};

module.exports = function() {};
