/**
 * @namespace Room
 */

var db        = require('../utils/db.js');
var validator = require('../utils/validator.js');
var async     = require('async');
var sql       = require('../utils/require_sql.js');

Room = {};

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
      enum: [ 'Buyer', 'Seller' ]
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
      enum: [ 'Group', 'Direct' ]
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with Room object
var sql_insert                         = require('../sql/room/insert.sql');
var sql_get                            = require('../sql/room/get.sql');
var sql_update                         = require('../sql/room/update.sql');
var sql_delete                         = require('../sql/room/delete.sql');
var sql_archive                        = require('../sql/room/archive.sql');
var sql_delete_recommendations         = require('../sql/room/delete_recommendations.sql');
var sql_delete_invitations             = require('../sql/room/delete_invitations.sql');
var sql_delete_notifications           = require('../sql/room/delete_notifications.sql');
var sql_delete_alerts                  = require('../sql/room/delete_alerts.sql');
var sql_delete_messages                = require('../sql/room/delete_messages.sql');
var sql_user_rooms                     = require('../sql/room/user_rooms.sql');
var sql_add_user                       = require('../sql/room/add_user.sql');
var sql_get_users                      = require('../sql/room/get_users.sql');
var sql_others                         = require('../sql/room/others.sql');
var sql_dup                            = require('../sql/room/dup.sql');
var sql_new_counts                     = require('../sql/room/new_counts.sql');
var sql_is_member                      = require('../sql/room/is_member.sql');
var sql_update_lead_agent              = require('../sql/room/update_lead_agent.sql');
var sql_hide_orphaned_recs             = require('../sql/room/hide_orphaned_recs.sql');
var sql_leave                          = require('../sql/room/leave.sql');
var sql_leave_all                      = require('../sql/room/leave_all.sql');
var sql_new_counts                     = require('../sql/room/new_counts.sql');
var sql_media                          = require('../sql/room/media.sql');

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
        return cb(Error.Conflict())
      } else {
        return cb(err);
      }
    } else {
      return cb();
    }
  });
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

    async.parallel({
      owner: function(cb) {
        if(!room.owner)
          return cb();

        return User.get(room.owner, cb);
      },
      users: function(cb) {
        Room.getUsers(room_id, cb);
      },
      lead_agent: function(cb) {
        if(!room.lead_agent)
          return cb();

        return User.get(room.lead_agent, cb);
      }
    }, function(err, results) {
         if(err)
           return cb(err);

         room.owner = results.owner;
         room.users = results.users;
         room.lead_agent = results.lead_agent;

         return cb(null, room);
       });
  });
}

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
    insert: ['validate',
             'user',
             function(cb, results) {
               insert(room, cb);
             }],
    add_owner: ['validate',
                'user',
                'insert',
                function(cb, results) {
                  if(room.owner)
                    return Room.addUser(room.owner, results.insert, cb);
                  else
                    return cb();
                }],
    room: ['validate',
           'user',
           'insert',
           'add_owner',
           function(cb, results) {
             Room.get(results.insert, cb);
           }]
  }, function(err, results) {
       if(err)
         return cb(err);

       return cb(null, results.room)
     });
}

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
}

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
}

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
      Room.get(room_id, function(err, room) {
        if(err)
          return cb(err);

        return cb(null, room);
      });
    },
    delete_recommendations: function(cb) {
      Room.deleteRecommendations(room_id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    },
    delete_invitations: function(cb) {
      Room.deleteInvitations(room_id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    },
    delete_notifications: function(cb) {
      Room.deleteNotifications(room_id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    },
    delete_users: function(cb) {
      Room.removeUsers(room_id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    },
    delete_alerts: function(cb) {
      Room.deleteAlerts(room_id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    },
    delete_object: function(cb) {
      Room.deleteObject(room_id, function(err, ok) {
        if(err)
          return cb(err);

        return cb(null, ok);
      });
    }
  }, function(err, results) {
       if(err)
         return cb(err);

       return cb(null, results.get);
     });
}

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
  db.query(sql_user_rooms, [user_id, paging.type, paging.timestamp, paging.limit], function(err, res) {
    if(err)
      return cb(err);

    var room_ids = res.rows.map(function(r) {
                     return r.room;
                   });

    async.map(room_ids, Room.get, function(err, rooms) {
      if(err)
        return cb(err);

      if (res.rows.length > 0)
        rooms[0].total = res.rows[0].total;

      return cb(null, rooms);
    });
  });
}

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
  Room.getUsersIds(room_id, function(err, user_ids) {
    if(err)
      return cb(err);

    async.map(user_ids, User.get, function(err, users) {
      if(err)
        return cb(err);

      return cb(null, users);
    });
  });
}

/**
 * Retrievs IDs of all the members of a `room`
 * @name getUsersIds
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {uuid[]} collection of room members UUIDs
 */
Room.getUsersIds = function(room_id, cb) {
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
}

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
}

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
}

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
}

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
}

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
}

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
}

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
}

/**
 * Checks whether a `user` is a member of this `room`
 * @name isMember
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.isMember = function(room_id, user_id, cb) {
  db.query(sql_is_member, [room_id, user_id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, (res.rows[0].is_member >= 1) ? true : false);
  });
}

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
    add_user: ['user',
               'room',
               function(cb) {
                 add_user(user_id, room_id, cb);
               }],
    lead_agent: ['user',
                 'room',
                 function(cb, results) {
                   if(!results.room.lead_agent && results.user.user_type == 'Agent') {
                     return Room.updateLeadAgent(room_id, user_id, cb);
                   } else {
                     return cb();
                   }
                 }],
    notification: ['user',
                   'room',
                   function(cb, results) {
                     var notification = {};
                     notification.action = 'Joined';
                     notification.subject = user_id;
                     notification.subject_class = 'User';
                     notification.object = room_id;
                     notification.object_class = 'Room';
                     notification.message = '#' + results.room.title + ': @' + results.user.first_name + ' just joined';

                     // Notification.issueForRoomExcept(room_id, user_id, notification, function(err, ok) {
                       // if(err)
                         // return cb(err);

                       return cb(null, true);
                     // });
                   }]
  }, function(err, results) {
       if(err)
         return cb(err);

       return cb(null, true);
     });
}

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
  var room = {}
  room.room_type = 'OneToOneMessaging';
  room.users = [ user_id, peer_id ];

  Room.create(room, function(err, room) {
    if(err)
      return cb(err);

    return cb(null, room.id);
  });
}

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
}

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
  db.query(sql_hide_orphaned_recs, [room_id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, true);
  });
}

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
}

/**
 * Recommends a `Listing` to the specified `room`. We expect `ref_object_id` be present
 * in the external_info object as a mandatory field. This method automatically adds invoking
 * alert to the list of referring_alerts.
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
  var alert_id = external_info.ref_object_id;

  Room.get(room_id, function(err, room) {
    if(err)
      return cb(err);

    Listing.get(listing_id, function(err, listing) {
      if(err)
        return cb(err);

      Room.isDup(room_id, listing_id, function(err, dup) {
        if(err)
          return cb(err);

        if (dup) {
          async.auto({
            add_alert_to_recommendation: function(cb) {
              Recommendation.addAlert(dup, alert_id, cb);
            },
            unhide_recommendation: ['add_alert_to_recommendation',
                                    function(cb) {
                                      Recommendation.unhide(dup, cb);
                                    }],
            recommendation: ['add_alert_to_recommendation',
                             'unhide_recommendation',
                             function(cb) {
                               Recommendation.get(dup, cb);
                             }]
          }, function(err, results) {
               if(err)
                 return cb(err);

               return cb(null, results.recommendation);
             });
        } else {
          var recommendation = {};

          recommendation.source = external_info.source || 'MLS';
          recommendation.source_url = external_info.source_url || 'http://www.ntreis.net/';
          recommendation.room = room_id;
          recommendation.referring_alerts = '{' + alert_id + '}';
          recommendation.listing = listing_id;
          recommendation.recommendation_type = 'Listing';
          recommendation.matrix_unique_id = listing.matrix_unique_id;

          async.auto({
            insert: function(cb) {
              return Recommendation.create(recommendation, cb);
            },
            users: function(cb) {
              return Room.getUsersIds(room_id, cb);
            },
            recommendation: ['insert',
                             function(cb, results) {
                               return Recommendation.get(results.insert.id, cb);
                             }],
            notifications: ['users',
                            'insert',
                            function(cb, results) {
                              if (external_info.enable_push) {
                                var address_line = Address.getLocalized(results.listing.property.address);
                                var notification = {};

                                notification.action = 'BecameAvailable';
                                notification.subject = listing_id;
                                notification.subject_class = 'Listing';
                                notification.object = room_id;
                                notification.object_class = 'Room';
                                notification.message = '#' + room.title + ': ' + address_line + ' just hit the market';
                                notification.recommendation = results.insert.id;
                                notification.auxiliary_subject = alert_id;
                                notification.auxiliary_subject_class = 'Alert';

                                return Notification.issueForRoom(room_id, notification, cb);
                              } else {
                                return cb();
                              }
                            }]
          }, function(err, results) {
               if(err)
                 return cb(err);

               return cb(null, results.recommendation);
             });
        }
      });
    });
  });
}

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
  db.query(sql_archive, [room_id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, true);
  });
}

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
}

/**
 * Strips unwanted information from a `room` object
 * that leading agent.
 * @name publicize
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 * @returns {Room#room}
 */
Room.publicize = function(model) {
  if (model.owner) User.publicize(model.owner);
  if (model.lead_agent) User.publicize(model.lead_agent)
  if (model.users) model.users.map(User.publicize);

  return model;
}

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
}

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
}

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
  db.query(sql_leave, [room_id, user_id], function(err, res) {
    if(err)
      return cb(err);

    cb(null, true);
  });
}

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
}

Room.belongs = function(members, user) {
  var member_ids = members.map(function(r) {
                     return r.id;
                   });

  if (!user || (member_ids.indexOf(user) != -1))
    return true;
  else
    return false;
}

module.exports = function(){};