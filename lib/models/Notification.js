var validator = require('../utils/validator.js');
var db = require('../utils/db.js');
var config = require('../config.js');
var sql = require('../utils/require_sql.js');
var async = require('async');
var UrbanAirshipPush = require('urban-airship-push');
var _u = require('underscore');

Notification = {};

var schema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: ['Liked', 'Composed', 'Edited',
             'Added', 'Removed', 'Posted',
             'Favorited', 'Changed', 'Created',
             'Shared', 'Arrived', 'Toured',
             'Accepted', 'Declined', 'Joined',
             'Left', 'Archived', 'Deleted',
             'Opened', 'Closed', 'Pinned', 'Sent',
             'Invited', 'BecameAvailable', 'PriceDropped', 'StatusChanged'],
      required: true
    },

    object_class: {
      type: 'string',
      enum: ['Recommendation', 'Listing', 'Message',
             'Comment', 'Room', 'HotSheet',
             'Photo', 'Video', 'Document',
             'Tour', 'Co-Shopper', 'Price',
             'Status', 'User', 'Alert'],
      required: true
    },

    subject_class: {
      type: 'string',
      enum: ['Recommendation', 'Listing', 'Message',
             'Comment', 'Room', 'HotSheet',
             'Photo', 'Video', 'Document',
             'Tour', 'Co-Shopper', 'Price',
             'Status', 'Room', 'Room',
             'User', 'Alert'],
      required: true
    },

    message: {
      type: 'string',
      required: true
    },

    image_url: {
      type: 'string',
      required: false
    },

    notified_user: {
      type: 'string',
      uuid: true,
      required: false
    },

    object: {
      type: 'string',
      uuid: true,
      required: true
    },

    subject: {
      type: 'string',
      uuid: true,
      required: true
    },

    room: {
      type: 'string',
      uuid: true,
      required: false
    },

    auxiliary_object: {
      type: 'string',
      uuid: true,
      required: false
    },

    auxiliary_object_class: {
      type: 'string',
      enum: ['Recommendation', 'Listing', 'Message',
             'Comment', 'Room', 'HotSheet',
             'Photo', 'Video', 'Document',
             'Tour', 'Co-Shopper', 'Price',
             'Status', 'Room', 'Room',
             'User', 'Alert'],
      required: false
    },

    auxiliary_subject: {
      type: 'string',
      uuid: true,
      required: false
    },

    auxiliary_subject_class: {
      type: 'string',
      enum: ['Recommendation', 'Listing', 'Message',
             'Comment', 'Room', 'HotSheet',
             'Photo', 'Video', 'Document',
             'Tour', 'Co-Shopper', 'Price',
             'Status', 'Room', 'Room',
             'User', 'Alert'],
      required: false
    },

    recommendation: {
      type: 'string',
      uuid: true,
      required: false
    }
  }
}

var validate = validator.bind(null, schema);

// SQL queries to work with recommendation objects
// var sql_get = require("../sql/notification/get.sql");
// var sql_insert = require('../sql/notification/insert.sql');
// var sql_user = require('../sql/notification/user.sql');
// var sql_patch = require('../sql/notification/patch.sql');
// var sql_delete = require('../sql/notification/delete.sql');
// var sql_register_push = require('../sql/notification/register_push.sql');
// var sql_unregister_push = require('../sql/notification/unregister_push.sql');
// var sql_user_room = require('../sql/notification/user_room.sql');
// var sql_user_room_room = require('../sql/notification/user_room_room.sql');
// var sql_user_room_all_rooms = require('../sql/notification/user_room_all_rooms.sql');
// var sql_device_tokens = require('../sql/notification/device_tokens.sql');
// var sql_unread_count = require('../sql/notification/unread_count.sql');
// var sql_toggle_push_settings = require('../sql/notification/toggle_push_settings.sql');

function create(user, room, notification, cb) {
  validate(notification, function(err) {
    if(err)
      return cb(err);

    Recommendation.mapListingToRecommendationForUser(user, room, notification.listing, function(err, recommendation_id) {
      if(err)
        return cb(err);

      db.query(sql_insert, [
        notification.action,
        notification.object_class,
        notification.object,
        notification.subject,
        notification.message,
        notification.auxiliary_object_class,
        notification.auxiliary_object,
        recommendation_id,
        user,
        room,
        notification.auxiliary_subject,
        notification.subject_class,
        notification.auxiliary_subject_class,
        notification.extra_object_class,
        notification.extra_subject_class
      ], function(err, res) {
           if(err)
             return cb(err);

           Notification.get(res.rows[0].id, function(err, notification) {
             if(err)
               return cb(err);

             cb(null, notification);
           });
         });
    });
  });
}

function airship_transport_send_device(notification, token, cb) {
  var airship = new UrbanAirshipPush(config.airship);

  var pushInfo = {
    device_types: 'all',
    audience: {
      device_token: token
    },
    notification: {
      ios: {
        alert: notification.message,
        sound: 'default',
        badge: notification.badge_count,
        extra: {
          notification_id: notification.notification_id,
          object_type: notification.object_class,
          recommendation_id: notification.recommendation
        }
      }
    },
    device_types: ["ios"]
  };

  airship.push.send(pushInfo, function (err, data) {
    if(err) {
      console.log('Error sending push notification:', err);
      return cb();
    }

    return cb(null, data);
  });
}

function airship_transport_send(user, room, notification, cb) {
  Notification.getDeviceTokensForUser(user, function(err, tokens) {
    if(err)
      return cb(err);

    User.isPushOK(user, function(err, ok) {
      if(err)
        return cb(err);

      if(ok) {
        User.isPushOKOnRoom(user, room, function(err, ok) {
          if(ok) {
            async.mapSeries(tokens, function(token, cb) {
              return airship_transport_send_device(notification, token, cb);
            }, function(err, data) {
                 if(err)
                   return cb(err);

                 return cb(null, data);
               });
          } else {
            return cb();
          }
        });
      } else {
        return cb();
      }
    });
  });
}

Notification.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
      return cb(null, false);

    var notification = res_base.rows[0];
    var ref = {
      user: notification.notified_user,
      room: notification.room
    };

    async.parallel({
      notified_user: function(cb) {
        if (!notification.notified_user)
          return cb();

        return User.get(notification.notified_user, cb);
      },
      room: function(cb) {
        if(!notification.room)
          return cb();

        return Room.get(notification.room, cb);
      },
      object: function(cb) {
        if(!notification.object)
          return cb();

        return ObjectUtil.dereference(notification.object_class, notification.object, ref, cb);
      },
      subject: function(cb) {
        if(!notification.subject)
          return cb();

        return ObjectUtil.dereference(notification.subject_class, notification.subject, ref, cb);
      },
      auxiliary_object: function(cb) {
        if(!notification.auxiliary_object)
          return cb();

        return ObjectUtil.dereference(notification.auxiliary_object_class, notification.auxiliary_object, ref, cb);
      },
      auxiliary_subject: function(cb) {
        if(!notification.auxiliary_subject)
          return cb();

        return ObjectUtil.dereference(notification.auxiliary_subject_class, notification.auxiliary_subject, ref, cb);
      },
      recommendation: function(cb) {
        if(!notification.recommendation)
          return cb();

        return Recommendation.getOnRoom(notification.recommendation, notification.room, cb);
      }
    }, function(err, results) {
         if(err)
           return cb(err);

         var res_final = notification;
         res_final.notified_user = results.notified_user || null;
         res_final.room = results.room || null;
         res_final.objects = (results.object) ? [ results.object ] : null;
         res_final.subjects = (results.subject) ? [ results.subject ] : null;
         res_final.auxiliary_subject = results.auxiliary_subject || null;
         res_final.auxiliary_object = results.auxiliary_object || null;
         res_final.recommendations = (results.recommendation) ? [ results.recommendation ] : null;

         return cb(null, res_final);
       });
  });
}

Notification.create = function(user, room, notification, cb) {
  async.auto({
    record_notification: function(cb) {
      return create(user, room, notification, cb);
    },
    default_room: function(cb) {
      return Room.getDefaultRoom(room, cb);
    },
    badge_count: ['record_notification',
                  function(cb, results) {
                    return Notification.totalUnreadCount(user, cb);
                  }],
    airship_push: ['record_notification',
                   'badge_count',
                   function(cb, results) {
                     var airship_notification = _u.clone(notification);
                     airship_notification.notification_id = results.record_notification.id;
                     airship_notification.recommendation = ((results.record_notification.recommendation) ? results.record_notification.recommendation.id : null);
                     airship_notification.badge_count = parseInt(results.badge_count) || 0;

                     return airship_transport_send(user, room, airship_notification, cb);
                   }],
    notification_view_messages: ['record_notification',
                                 'default_room',
                                 function(cb, results) {
                                   if((notification.action != 'Sent') ||
                                      (notification.action == 'Sent' && notification.auxiliary_object.room_type == 'Comment')) {
                                     var message = {};

                                     message.message_type = 'TopLevel';
                                     message.comment = notification.message;
                                     message.notification = results.record_notification;
                                     Notification.publicize(message.notification);
                                     message.viewable_by = user;
                                     return Message.record(results.default_room, message, false, cb);
                                   } else {
                                     return cb();
                                   }
                                 }]
  }, function(err, results) {
       if(err)
         return cb(err);

       return cb(null, results.record_notification);
     });
}

Notification.getDeviceTokensForUser = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_device_tokens, [user_id], function(err, res) {
      if(err)
        return cb(err);

      var tokens = res.rows.map(function(r) {
                     return r.device_token;
                   });

      return cb(null, tokens);
    });
  });
}

Notification.getForUser = function(user_id, read, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_user, [user_id, read], function(err, res) {
      if(err)
        return cb(err);

      if(res.rows.length < 1)
        return cb(null, []);

      var notification_ids = res.rows.map(function(r) {
                               return r.id;
                             });
      async.map(notification_ids, Notification.get, function(err, notifications) {
        if(err)
          return cb(err);

        return cb(null, notifications);
      });
    });
  });
}

Notification.getForUserOnRoom = function(user_id, room_id, read, cb) {
  db.query(sql_user_room, [user_id, room_id, read], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var notification_ids = res.rows.map(function(r) {
                           return r.id;
                         });
    async.map(notification_ids, Notification.get, function(err, notifications) {
      if(err)
        return cb(err);

      return cb(null, notifications);
    });
  });
}

Notification.getForUserOnRoomOnRoom = function(user_id, room_id, room_id, read, cb) {
  db.query(sql_user_room_room, [user_id, room_id, room_id, read], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var notification_ids = res.rows.map(function(r) {
                           return r.id;
                         });
    async.map(notification_ids, Notification.get, function(err, notifications) {
      if(err)
        return cb(err);

      return cb(null, notifications);
    });
  });
}

Notification.getForUserOnRoomOnAllRooms = function(user_id, room_id, read, cb) {
  db.query(sql_user_room_all_rooms, [user_id, room_id, read], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(null, []);

    var notification_ids = res.rows.map(function(r) {
                           return r.id;
                         });
    async.map(notification_ids, Notification.get, function(err, notifications) {
      if(err)
        return cb(err);

      return cb(null, notifications);
    });
  });
}

Notification.patch = function(notification_id, read, cb) {
  db.query(sql_patch, [notification_id, read], function(err, res) {
    if(err)
      return cb(err);

    Notification.get(notification_id, function(err, notification) {
      if(err)
        return cb(err);

      return cb(null, notification);
    });
  });
}

Notification.delete = function(id, cb) {
  db.query(sql_delete, [id], function(err, res) {
    if(err)
      return cb(err);

    return cb(null, true);
  });
}

Notification.totalUnreadCount = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_unread_count, [user_id], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, res.rows[0].total_count);
    });
  });
}

Notification.issueForUsers = function(users, room, notification, cb) {
  async.mapSeries(users,
                  function(id, cb) {
                    return Notification.create(id, room, notification, cb);
                  },
                  function(err, notifications) {
                    if(err)
                      return cb(err);

                    return cb(null, notifications);
                  }
                 );
}

Notification.issueForRoom = function(room, notification, cb) {
  Room.getUserIds(room, function(err, users) {
    if(err)
      return cb(err);

    return Notification.issueForUsers(users, room, notification, cb);
  });
}

Notification.issueForRoomExcept = function(room, user, notification, cb) {
  Room.others(room, user, function(err, others) {
    if(err)
      return cb(err);

    return Notification.issueForUsers(others, room, notification, cb);
  });
}

Notification.issueForRoom = function(room, room, notification, cb) {
  Room.getUserIds(room, function(err, users) {
    if(err)
      return cb(err);

    return Notification.issueForUsers(users, room, notification, cb);
  });
}

Notification.issueForRoomExcept = function(room, user, room, notification, cb) {
  Room.others(room, user, function(err, others) {
    if(err)
      return cb(err);

    return Notification.issueForUsers(others, room, notification, cb);
  });
}

Notification.issueForUser = function(user, room, notification, cb) {
  return Notification.create(user, room, notification, cb);
}

Notification.registerForPush = function(user_id, token, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_register_push, [user_id, token], function(err, res) {
      if(err) {
        if(err.code === '23505') {
          return cb(Error.Conflict());
        } else {
          return cb(err);
        }
      } else {
        return cb(null, user);
      }
    });
  });
}

Notification.unregisterForPush = function(user_id, token, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_unregister_push, [user_id, token], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, user);
    });
  });
}

Notification.togglePushSettings = function(user_id, room_id, enable, cb) {
  db.query(sql_toggle_push_settings, [user_id, room_id, enable], function(err, res) {
    if(err)
      return cb(err);

    return cb();
  });
}

Notification.publicize = function(model) {
  if(model.object) delete model.object;
  if(model.subject) delete model.subject;

  if(model.notified_user) User.publicize(model.notified_user);
  if(model.room) Room.publicize(model.room);
  if(model.objects) model.objects.map(global[model.object_class].publicize);
  if(model.subjects) model.subjects.map(global[model.subject_class].publicize);
  if(model.auxiliary_object) global[model.auxiliary_object_class].publicize(model.auxiliary_object);
  if(model.auxiliary_subject) global[model.auxiliary_subject_class].publicize(model.auxiliary_subject);

  return model;
}

module.exports = function(){};