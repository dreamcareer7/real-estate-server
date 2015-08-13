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
             'Invited', 'BecameAvailable'],
      required: true
    },

    object_class: {
      type: 'string',
      enum: ['Recommendation', 'Listing', 'Message',
             'Comment', 'Room', 'HotSheet',
             'Photo', 'Video', 'Document',
             'Tour', 'Co-Shopper', 'Price',
             'Status', 'MessageRoom', 'Shortlist',
             'User', 'Alert'],
      required: true
    },

    subject_class: {
      type: 'string',
      enum: ['Recommendation', 'Listing', 'Message',
             'Comment', 'Room', 'HotSheet',
             'Photo', 'Video', 'Document',
             'Tour', 'Co-Shopper', 'Price',
             'Status', 'MessageRoom', 'Shortlist',
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

    shortlist: {
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
             'Status', 'MessageRoom', 'Shortlist',
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
             'Status', 'MessageRoom', 'Shortlist',
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
var sql_get = require("../sql/notification/get.sql");
var sql_insert = require('../sql/notification/insert.sql');
var sql_user = require('../sql/notification/user.sql');
var sql_patch = require('../sql/notification/patch.sql');
var sql_delete = require('../sql/notification/delete.sql');
var sql_register_push = require('../sql/notification/register_push.sql');
var sql_unregister_push = require('../sql/notification/unregister_push.sql');
var sql_user_shortlist = require('../sql/notification/user_shortlist.sql');
var sql_user_shortlist_message_room = require('../sql/notification/user_shortlist_message_room.sql');
var sql_user_shortlist_all_message_rooms = require('../sql/notification/user_shortlist_all_message_rooms.sql');
var sql_device_tokens = require('../sql/notification/device_tokens.sql');
var sql_unread_count = require('../sql/notification/unread_count.sql');

function create(user, shortlist, notification, cb) {
  validate(notification, function(err) {
    if(err)
      return cb(err);

    Recommendation.mapListingToRecommendationForUser(user, shortlist, notification.listing, function(err, recommendation_id) {
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
        shortlist,
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
    if(err)
      return cb(err);

    return cb(null, data);
  });
}

function airship_transport_send(user, shortlist, notification, cb) {
  Notification.getDeviceTokensForUser(user, function(err, tokens) {
    if(err)
      return cb(err);

    async.mapSeries(tokens, function(token, cb) {
      return airship_transport_send_device(notification, token, cb);
    }, function(err, data) {
         if(err)
           return cb(err);

         return cb(null, data);
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
      shortlist: notification.shortlist
    };

    async.parallel({
      notified_user: function(cb) {
        if (!notification.notified_user)
          return cb();

        return User.get(notification.notified_user, cb);
      },
      shortlist: function(cb) {
        if(!notification.shortlist)
          return cb();

        return Shortlist.get(notification.shortlist, cb);
      },
      object: function(cb) {
        if(!notification.object)
          return cb();

        return Object.dereference(notification.object_class, notification.object, ref, cb);
      },
      subject: function(cb) {
        if(!notification.subject)
          return cb();

        return Object.dereference(notification.subject_class, notification.subject, ref, cb);
      },
      auxiliary_object: function(cb) {
        if(!notification.auxiliary_object)
          return cb();

        return Object.dereference(notification.auxiliary_object_class, notification.auxiliary_object, ref, cb);
      },
      auxiliary_subject: function(cb) {
        if(!notification.auxiliary_subject)
          return cb();

        return Object.dereference(notification.auxiliary_subject_class, notification.auxiliary_subject, ref, cb);
      },
      recommendation: function(cb) {
        if(!notification.recommendation)
          return cb();

        return Recommendation.getOnShortlist(notification.recommendation, notification.shortlist, cb);
      }
    }, function(err, results) {
         if(err)
           return cb(err);

         var res_final = notification;
         res_final.notified_user = results.notified_user || null;
         res_final.shortlist = results.shortlist || null;
         res_final.objects = (results.object) ? [ results.object ] : null;
         res_final.subjects = (results.subject) ? [ results.subject ] : null;
         res_final.auxiliary_subject = results.auxiliary_subject || null;
         res_final.auxiliary_object = results.auxiliary_object || null;
         res_final.recommendations = (results.recommendation) ? [ results.recommendation ] : null;

         return cb(null, res_final);
       });
  });
}

Notification.create = function(user, shortlist, notification, cb) {
  async.auto({
    record_notification: function(cb) {
      return create(user, shortlist, notification, cb);
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

                     return airship_transport_send(user, shortlist, airship_notification, cb);
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

Notification.getForUserOnShortlist = function(user_id, shortlist_id, read, cb) {
  db.query(sql_user_shortlist, [user_id, shortlist_id, read], function(err, res) {
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

Notification.getForUserOnShortlistOnMessageRoom = function(user_id, shortlist_id, message_room_id, read, cb) {
  db.query(sql_user_shortlist_message_room, [user_id, shortlist_id, message_room_id, read], function(err, res) {
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

Notification.getForUserOnShortlistOnAllMessageRooms = function(user_id, shortlist_id, read, cb) {
  db.query(sql_user_shortlist_all_message_rooms, [user_id, shortlist_id, read], function(err, res) {
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

Notification.issueForUsers = function(users, shortlist, notification, cb) {
  async.mapSeries(users,
                  function(id, cb) {
                    return Notification.create(id, shortlist, notification, cb);
                  },
                  function(err, notifications) {
                    if(err)
                      return cb(err);

                    return cb(null, notifications);
                  }
                 );
}

Notification.issueForShortlist = function(shortlist, notification, cb) {
  Shortlist.getUserIds(shortlist, function(err, users) {
    if(err)
      return cb(err);

    return Notification.issueForUsers(users, shortlist, notification, cb);
  });
}

Notification.issueForShortlistExcept = function(shortlist, user, notification, cb) {
  Shortlist.others(shortlist, user, function(err, others) {
    if(err)
      return cb(err);

    return Notification.issueForUsers(others, shortlist, notification, cb);
  });
}

Notification.issueForMessageRoom = function(message_room, shortlist, notification, cb) {
  MessageRoom.getUserIds(message_room, function(err, users) {
    if(err)
      return cb(err);

    return Notification.issueForUsers(users, shortlist, notification, cb);
  });
}

Notification.issueForMessageRoomExcept = function(message_room, user, shortlist, notification, cb) {
  MessageRoom.others(message_room, user, function(err, others) {
    if(err)
      return cb(err);

    return Notification.issueForUsers(others, shortlist, notification, cb);
  });
}

Notification.issueForUser = function(user, shortlist, notification, cb) {
  return Notification.create(user, shortlist, notification, cb);
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

Notification.publicize = function(model) {
  if(model.notified_user) User.publicize(model.notified_user);
  if(model.shortlist) Shortlist.publicize(model.shortlist);
  if(model.objects) model.objects.map(global[model.object_class].publicize);
  if(model.subjects) model.subjects.map(global[model.subject_class].publicize);

  return model;
}

module.exports = function(){};