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
 * @property {string} title - room title
 * @property {Room#client_type} client_type - type indicating the purpose of this room
 * @property {Room#room_status=} status - status of the room
 * @property {Room#room_type}
 * @property {User#user=} owner - owner of this room
 * @property {User#user=} lead_agent - leading agent associated with this room
 * @property {User#user[]} users - list of all the members of this room
 * @property {number} user_code - automatically generated `user` code. We use this code to give users the ability to easily connect with each other
 * @property {timestamp} created_at - indicates when this object was created
 * @property {timestamp=} updated_at - indicates when this object was last modified
 * @property {timestamp=} deleted_at - indicates when this object was deleted
 */

var schema = {
  type: 'object',
  properties: {
    client_type: {
      type: 'string',
      required: true,
      enum: [ 'Shoppers', 'Sellers' ]
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
      enum: [ 'Group', 'OneToOne' ]
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with Room object
var sql_insert                         = require('../sql/room/insert.sql');
var sql_get                            = require('../sql/room/get.sql');
var sql_update                         = require('../sql/room/update.sql');
var sql_delete                         = require('../sql/room/delete.sql');
var sql_delete_recommendations         = require('../sql/room/delete_recommendations.sql');
var sql_delete_users                   = require('../sql/room/delete_users.sql');
var sql_delete_invitations             = require('../sql/room/delete_invitations.sql');
var sql_delete_notifications           = require('../sql/room/delete_notifications.sql');
var sql_delete_alerts                  = require('../sql/room/delete_alerts.sql');
var sql_delete_messages                = require('../sql/room/delete_messages.sql');
var sql_user_rooms                     = require('../sql/room/user_rooms.sql');
var sql_add_user                       = require('../sql/room/add_user.sql');
var sql_get_users                      = require('../sql/room/get_users.sql');

var sql_others                         = require('../sql/room/others.sql');
var sql_dup                            = require('../sql/room/dup.sql');
var sql_join_default                   = require('../sql/room/join_default.sql');
var sql_get_default                    = require('../sql/room/get_default.sql');
var sql_get_one_to_ones                = require('../sql/room/get_one_to_ones.sql');
var sql_join_comments                  = require('../sql/room/join_comments.sql');
var sql_set_alert_index                = require('../sql/room/set_alert_index.sql');
var sql_new_counts                     = require('../sql/room/new_counts.sql');
var sql_is_member                      = require('../sql/room/is_member.sql');
var sql_update_rec_time                = require('../sql/room/update_rec_time.sql');
var sql_hide_orphaned_recs             = require('../sql/room/hide_orphaned_recs.sql');
var sql_deactivate_orphaned_recs_rooms = require('../sql/room/deactivate_orphaned_recs_rooms.sql');
var sql_archive                        = require('../sql/room/archive.sql');
var sql_get_recommendations            = require('../sql/room/get_recommendations.sql');
var sql_update_lead_agent              = require('../sql/room/update_lead_agent.sql');
var sql_add_user                       = require('../sql/room/add_user.sql');
var sql_leave                          = require('../sql/room/leave.sql');
var sql_leave_all                      = require('../sql/room/leave_all.sql');
var sql_delete                         = require('../sql/room/delete.sql');
var sql_get_users                      = require('../sql/room/get_users.sql');
var sql_others                         = require('../sql/room/others.sql');
var sql_new_counts                     = require('../sql/room/new_counts.sql');
var sql_add_missing_acks               = require('../sql/room/add_missing_acks.sql');
var sql_activate                       = require('../sql/room/activate.sql');
var sql_deactivate                     = require('../sql/room/deactivate.sql');
var sql_media                          = require('../sql/room/media.sql');
var sql_get_shortlist                  = require('../sql/room/get_shortlist.sql');

/**
 * Inserts a `Room` object into database
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
 * Adds a `User` to a `Room`
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

/**
 * Retrieves a full `Room` object
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
 * Creates a `Room`
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
      User.get(room.owner, cb);
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
                  Room.addUser(room.owner, results.insert, cb);
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
 * Updates a `Room` after validating the whole object
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
 * Patches a `Room` object with new parameters
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

    data.owner = data.owner.id;
    data.leag_agent = data.lead_agent.id;

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
 * Deletes a `Room` object
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
      Room.deleteUsers(room_id, function(err, ok) {
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

       return cb(null, true);
     });
}

/**
 * Retrieves all `Room` objects that a particular user is a member of
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
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_user_rooms, [user_id, paging.type, paging.timestamp, paging.limit], function(err, res) {
      if(err)
        return cb(err);

      var room_ids = res.rows.map(function(r) {
                       return r.room;
                     });

      async.map(room_ids, Room.get, function(err, rooms) {
        if(err)
          return cb(err);

        return cb(null, rooms);
      });
    });
  });
}

/**
 * Retrievs all the members of a `Room`
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
 * Retrievs IDs of all the members of a `Room`
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
 * Deletes all `Users` from this `Room`
 * @name deleteUsers
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {callback} cb - callback function
 */
Room.deleteUsers = function(room_id, cb) {
  db.query(sql_delete_users, [room_id], cb);
}

/**
 * Deletes all `Messages` posted to this `Room`
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
 * Deletes all `Invitations` sent for this `Room`
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
 * Deletes all `Recommendations` generated for this `Room`
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
 * Deletes all `Notifications` generated for this `Room`
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
 * Deletes all `Alerts` created for this `Room`
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
 * Deletes this `Room` object
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
 * Checks whether a `User` is a member of this `Room`
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
 * Adds a `User` to this `Room`
 * @name addUser
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {uuid} user_id - ID of the referenced user
 * @param {callback} cb - callback function
 * @returns {boolean}
 */
Room.addUser = function(room_id, user_id, cb) {
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

                     Notification.issueForRoomExcept(room_id, user_id, notification, function(err, ok) {
                       if(err)
                         return cb(err);

                       return cb(null, true);
                     });
                   }]
  }, function(err, results) {
       if(err)
         return cb(err);

       return cb(null, true);
     });
}

/**
 * Creates a `Room` of type `Direct` between two users
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
 * Returns a list of IDs for all the users in a `Room` except for the referenced user
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
 * Returns a list of IDs for all the users in a `Room` except for the referenced user
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
 * Returns a list of IDs for all the users in a `Room` except for the referenced user
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

Room.recommendListing = function(room_id, listing_id, external_info, cb) {
  var alert_id = external_info.ref_object_id;

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
          recommendation_deref: ['add_alert_to_recommendations',
                                  'unhide_listing_on_room',
                                  'recommendations',
                                  function(cb, results) {
                                    async.map(results.recommendations, function(r, cb) {
                                      Recommendation.getOnRoom(r, room_id, cb);
                                    }, function(err, recs) {
                                         if(err)
                                           return cb(err);

                                         if(external_info.restrict)
                                           recs = recommendationRestrict(recs, external_info.ref_object_id);

                                         return cb(null, recs);
                                       });
                                    }]
          }, function(err, results) {
               if(err)
                 return cb(err);

               return cb(null, results.recommendations_deref);
          });
      } else {
        var recommendation = {};
        var room = {};

        recommendation.source = external_info.source || 'MLS';
        recommendation.source_url = external_info.source_url || 'http://www.ntreis.net/';
        recommendation.referred_room = room_id;
        recommendation.referring_alerts = '{' + alert_id + '}';
        recommendation.object = listing_id;
        recommendation.recommendation_type = 'Listing';
        recommendation.matrix_unique_id = listing.matrix_unique_id;
        recommendation.status = 'Unacknowledged';

        room.room_type = 'Comment';
        room.listing = listing_id;
        room.room = room_id;

        async.auto({
          room: function(cb) {
            return Room.get(room_id, cb);
          },
          users: function(cb) {
            return Room.getUserIds(room_id, cb);
          },
          comment_room: function(cb) {
            return Room.create(room, cb);
          },
          listing: function(cb) {
            Listing.get(listing_id, cb);
          },
          join_users: ['comment_room',
                       function(cb, results) {
                         Room.addUsersToRoom(results.comment_room.id,
                                                    results.users,
                                                    function(err, ok) {
                                                      if(err)
                                                        return cb(err);

                                                      return cb(null, ok);
                                                    });
                       }],
          recommendations: ['users',
                            'comment_room',
                            function(cb, results) {
                              async.mapSeries(results.users, function(id, cb) {
                                var clone = JSON.parse(JSON.stringify(recommendation));
                                clone.referred_user = id;
                                clone.room = results.comment_room.id;

                                return Recommendation.create(clone, cb);
                              }, function(err, recs) {
                                   if(err)
                                     return cb(err);

                                   return cb(null, recs);
                                 });
                            }],
          notifications: ['users',
                          'comment_room',
                          'recommendations',
                          'room',
                          'listing',
                          function(cb, results) {
                            if (external_info.enable_push) {
                              var address_line = Address.getLocalized(results.listing.property.address);
                              var notification = {};

                              notification.action = 'BecameAvailable';
                              notification.subject = listing_id;
                              notification.subject_class = 'Listing';
                              notification.object =  room_id;
                              notification.object_class = 'Room';
                              notification.message = '#' + results.room.title + ': ' + address_line + ' just hit the market';
                              notification.listing = listing_id;
                              notification.auxiliary_subject = alert_id;
                              notification.auxiliary_subject_class = 'Alert';
                              notification.auxiliary_object = results.comment_room.id;
                              notification.auxiliary_object_class = 'Room';

                              return Notification.issueForRoom(room_id, notification, cb);
                            } else {
                              return cb();
                            }
                          }],
          recommendations_deref: ['recommendations',
                                  function(cb, results) {
                                    async.map(results.recommendations, function(r, cb) {
                                      return Recommendation.getOnRoom(r, room_id, cb);
                                    }, function(err, recs) {
                                         if(err)
                                           return cb(err);

                                         if(external_info.restrict)
                                           recs = recommendationRestrict(recs, external_info.ref_object_id);

                                         return cb(null, recs);
                                       });
                                  }]
        }, function(err, results) {
             if(err)
               return cb(err);

             return cb(null, results.recommendations_deref);
           });
      }
    });
  });
}

// Room.updateRecommendationTimes = function(room_id, listing_id, cb) {
//   db.query(sql_update_rec_time, [room_id, listing_id], function(err, res) {
//     if(err)
//       return cb(err);

//     return cb(null, true);
//   });
// }

// Room.archive = function(room_id, cb) {
//   db.query(sql_archive, [room_id], function(err, res) {
//     if(err)
//       return cb(err);

//     return cb(null, true);
//   });
// }

// Room.getRecommendations = function(room_id, listing_id, cb) {
//   db.query(sql_get_recommendations, [room_id, listing_id], function(err, res) {
//     if(err)
//       return cb(err);

//     var rec_ids = res.rows.map(function(r) {
//                     return r.id;
//                   });

//     return cb(null, rec_ids);
//   });
// }

// Room.updateLeadAgent = function(room_id, agent_id, cb) {
//   db.query(sql_update_lead_agent, [room_id, agent_id], function(err, res) {
//     if(err)
//       return cb(err);

//     return cb();
//   });
// }

// Room.publicize = function(model) {
//   if (model.owner) User.publicize(model.owner);
//   if (model.users) model.users.map(User.publicize);
//   delete model.alert_index;

//   return model;
// }

// Room.addMissingAcks = function(room_id, user_id, cb) {
//   db.query(sql_add_missing_acks, [room_id, user_id], function(err, res) {
//     if(err)
//       return cb(err);

//     return cb(null, false);
//   });
// }

// Room.addUserToRoom = function (room_id, user_id, cb) {
//   db.query(sql_add_user, [room_id, user_id], function(err, res) {
//     if(err)
//       return cb(err);

//     return Room.addMissingAcks(room_id, user_id, cb);
//   });
// }

// Room.create = function(room, cb) {
//   validate(room, function(err) {
//     if(err)
//       return cb(err);

//     insert(room, function(err, room_id) {
//       if(err)
//         return cb(err);

//       Room.get(room_id, function(err, room) {
//         if(err)
//           return cb(err);

//         cb(null, room);
//       });
//     });
//   });
// }

// Room.getNewCounts = function(room_id, user_id, cb) {
//   db.query(sql_new_counts, [room_id, user_id], function(err, res) {
//     if(err)
//       return cb(err);

//     return cb(null, res.rows[0]);
//   });
// }

// Room.getForUser = function(room_id, user_id, cb) {
//   Room.get(room_id, function(err, room) {
//     if(err)
//       return cb(err);

//     Room.getNewCounts(room_id, user_id, function(err, counts) {
//       if(err)
//         return cb(err);

//       room.new_comment_count = counts.new_comment_count || 0;
//       room.new_video_count = counts.new_video_count || 0;
//       room.new_image_count = counts.new_image_count || 0;
//       room.new_document_count = counts.new_document_count || 0;

//       return cb(null, room);
//     });
//   });
// }

// Room.get = function(id, cb) {
//   db.query(sql_get, [id], function(err, res) {
//     if(err)
//       return cb(err);

//     if(res.rows.length < 1)
//       return cb(Error.ResourceNotFound('Room not found'));

//     var room = res.rows[0];

//     async.parallel({
//       owner: function(cb) {
//         if (!room.owner)
//           return cb();

//         User.get(room.owner, cb);
//       },
//       listing: function(cb) {
//         if(!room.listing)
//           return cb();

//         Listing.get(room.listing, cb);
//       },
//       shortlist: function(cb) {
//         if(!room.shortlist)
//           return cb();

//         Shortlist.get(room.shortlist, cb);
//       },
//       users: function(cb) {
//         if(!room.users)
//           return cb();

//         room.users = room.users.filter(Boolean);
//         async.map(room.users, User.get, cb);
//       },
//       latest_message: function(cb) {
//         if(!room.latest_message)
//           return cb();

//         Message.get(room.latest_message, cb);
//       }
//     }, function(err, results) {
//          if(err)
//            return cb(err);

//          var res_final = room;
//          res_final.owner = results.owner || null;
//          res_final.listing = results.listing || null;
//          res_final.shortlist = results.shortlist || null;
//          res_final.users = results.users || null
//          res_final.latest_message = results.latest_message || null;

//          return cb(null, res_final);
//        });
//   });
// }

// Room.addUsersToRoom = function(room_id, users, cb) {
//   if (!users || users.length < 1) {
//     return cb(null, false);
//   } else {
//     async.mapSeries(users,
//                     function(id, cb) {
//                       return Room.addUserToRoom(room_id, id, cb);
//                     },
//                     function(err, foo) {
//                       if(err)
//                         return cb(err);

//                       return cb(null, true);
//                     }
//                    );
//   }
// }

// Room.deleteUserFromRoom = function(room_id, user_id, cb) {
//   db.query(sql_leave, [room_id, user_id], function(err, res) {
//     if(err)
//       return cb(err);

//     cb(null, true);
//   });
// }

// Room.deleteAllUsers = function(room_id, cb) {
//   db.query(sql_leave_all, [room_id], function(err, res) {
//     if(err)
//       return cb(err);

//     return cb(null, true);
//   });
// }

// Room.delete = function(room_id, cb) {
//   Room.deleteAllUsers(room_id, function(err, ok) {
//     if (err)
//       return cb(err);

//     db.query(sql_delete_messages, [room_id], function(err, res) {
//       if(err)
//         return cb(err);

//       db.query(sql_delete, [room_id], function(err, res) {
//         if(err)
//           return cb(err);

//         return cb(null, true);
//       });
//     });
//   });
// }

// Room.getUsers = function(room_id, cb) {
//   Room.get(room_id, function(err, room) {
//     if(err)
//       return cb(err);

//     db.query(sql_get_users, [room_id], function(err, res) {
//       if(err)
//         return cb(err);

//       if(res.rows.length < 1) {
//         return cb(null, false);
//       } else {
//         cb(null, res.rows);
//       }
//     });
//   });
// }

// Room.getUserIds = function(id, cb) {
//   Room.getUsers(id, function(err, users) {
//     if(err)
//       return cb(err);

//     var user_ids = users.map(function(r) {
//                      return r.user;
//                    });

//     return cb(null, user_ids);
//   });
// }

// Room.others = function(room_id, user_id, cb) {
//   Room.get(room_id, function(err, room) {
//     if(err)
//       return cb(err);

//     db.query(sql_others, [room_id, user_id], function(err, res) {
//       if(err)
//         return cb(err);

//       var others = res.rows.map(function(r) {
//                   return r.user;
//                 });

//       return cb(null, others);
//     });
//   });
// }

// Room.publicize = function(model) {
//   if (model.owner) User.publicize(model.owner);
//   if (model.listing) Listing.publicize(model.listing);
//   if (model.shortlist) Shortlist.publicize(model.shortlist);
//   if (model.users) model.users.map(User.publicize);
//   if (model.latest_message) Message.publicize(model.latest_message);

//   return model;
// }

// Room.recordAcks = function(room_id, user_id, message_id, cb) {
//   Room.get(room_id, function(err, room) {
//     if(err)
//       return cb(err);

//     Room.others(room_id, user_id, function(err, users) {
//       if(err)
//         return cb(err);

//       async.mapSeries(users, function(r, cb) {
//         return Message.recordAck(room_id, message_id, r, cb);
//       }, function(err, results) {
//            if(err)
//              return cb(err);

//            return cb(null, results);
//          });
//     });
//   });
// }

// Room.activate = function(room_id, cb) {
//   db.query(sql_activate, [room_id], function(err, res) {
//     if (err)
//       return cb(err);

//     return cb(null, true);
//   });
// }

// Room.deActivate = function(room_id, cb) {
//   db.query(sql_deactivate, [room_id], function(err, res) {
//     if (err)
//       return cb(err);

//     return cb(null, true);
//   });
// }

// Room.getMedia = function(room_id, paging, cb) {
//   Room.get(room_id, function(err, room) {
//     if(err)
//       return cb(err);

//     db.query(sql_media, [room_id, paging.type, paging.timestamp, paging.limit], function(err, res) {
//       if(err)
//         return cb(err);

//       var message_ids = res.rows.map(function(r) {
//                           return r.id;
//                         });

//       async.map(message_ids, Message.get, function(err, messages) {
//         if(err)
//           return cb(err);

//         return cb(null, messages);
//       });
//     });
//   });
// }

// Room.getShortlist = function(room_id, cb) {
//   db.query(sql_get_shortlist, [room_id], function(err, res) {
//     if(err)
//       return cb(err);

//     return cb(null, res.rows[0].shortlist);
//   });
// }

module.exports = function(){};