/**
 * @namespace Notification
 */

var validator           = require('../utils/validator.js');
var db                  = require('../utils/db.js');
var config              = require('../config.js');
var sql                 = require('../utils/require_sql.js');
var async               = require('async');
var _u                  = require('underscore');
var queue               = require('../utils/queue.js');
var UrbanAirshipPush    = require('urban-airship-push');


var sql_get             = require('../sql/notification/get.sql');
var sql_insert          = require('../sql/notification/insert.sql');
var sql_ack             = require('../sql/notification/ack.sql');
var sql_resolve_message = require('../sql/notification/resolve_message.sql');
var sql_user            = require('../sql/notification/user.sql');
var sql_register_push   = require('../sql/notification/register_push.sql');
var sql_unregister_push = require('../sql/notification/unregister_push.sql');
var sql_device_tokens   = require('../sql/notification/device_tokens.sql');
var sql_unread_count    = require('../sql/notification/unread_count.sql');

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
             'Invited', 'BecameAvailable', 'PriceDropped', 'StatusChanged',
             'TourRequested'],
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
      required: true
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
};

var validate = validator.bind(null, schema);

// SQL queries to work with recommendation objects

function create(notification, cb) {
  validate(notification, function(err) {
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
      notification.recommendation,
      notification.room,
      notification.auxiliary_subject,
      notification.subject_class,
      notification.auxiliary_subject_class,
      notification.extra_object_class,
      notification.extra_subject_class,
      notification.exclude,
      notification.specific
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
}

Notification.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res_base) {
    if(err) {
      return cb(err);
    }

    if(res_base.rows.length < 1)
      return cb(null, false);

    var notification = res_base.rows[0];

    async.parallel({
      object: function(cb) {
        if(!notification.object)
          return cb();

        return ObjectUtil.dereference(notification.object_class, notification.object, cb);
      },
      subject: function(cb) {
        if(!notification.subject)
          return cb();

        return ObjectUtil.dereference(notification.subject_class, notification.subject, cb);
      },
      auxiliary_object: function(cb) {
        if(!notification.auxiliary_object)
          return cb();

        return ObjectUtil.dereference(notification.auxiliary_object_class, notification.auxiliary_object, cb);
      },
      auxiliary_subject: function(cb) {
        if(!notification.auxiliary_subject)
          return cb();

        return ObjectUtil.dereference(notification.auxiliary_subject_class, notification.auxiliary_subject, cb);
      },
      recommendation: function(cb) {
        if(!notification.recommendation)
          return cb();

        return Recommendation.get(notification.recommendation, cb);
      }
    }, function(err, results) {
         if(err)
           return cb(err);

         notification.objects = (results.object) ? [ results.object ] : null;
         notification.subjects = (results.subject) ? [ results.subject ] : null;
         notification.auxiliary_subject = results.auxiliary_subject || null;
         notification.auxiliary_object = results.auxiliary_object || null;
         notification.recommendations = (results.recommendation) ? [ results.recommendation ] : null;

         if (notification.object_class == 'Message' || notification.object_class == 'Room')
           notification.object_class = null;

         if (notification.subject_class == 'Message' || notification.subject_class == 'Room')
           notification.subject_class = null;

         if (notification.auxiliary_object_class == 'Message' || notification.auxiliary_object_class == 'Room')
           notification.auxiliary_object_class = null;

         if (notification.auxiliary_subject_class == 'Message' || notification.auxiliary_subject_class == 'Room')
           notification.auxiliary_subject_class = null;

         return cb(null, notification);
       });
  });
};

Notification.create = function(notification, cb) {
  async.auto({
    room: function(cb) {
      return Room.get(notification.room, cb);
    },
    record_notification: ['room',
                          function(cb) {
                            return create(notification, cb);
                          }],
    users: ['room',
            function(cb) {
              Room.getUsersIDs(notification.room, function(err, ids) {
                if(err)
                  return cb(err);

                if(notification.specific)
                  return cb(null, [notification.specific]);

                return cb(null, _u.without(ids, notification.exclude));
              });
            }],
    save_job: ['record_notification',
               'users',
               function(cb, results) {
                 async.map(results.users, function(user_id, cb) {
                   Notification.totalUnreadCount(user_id, function(err, count) {
                     var airship_notification = _u.clone(notification);
                     airship_notification.notification_id = results.record_notification.id;
                     airship_notification.recommendation =
                       ((results.record_notification.recommendation) ? results.record_notification.recommendation.id : null);
                     airship_notification.badge_count = parseInt(count) || 0;

                     return queue.create('airship_transport_send', {
                       user_id:user_id,
                       room_id:notification.room,
                       airship_notification:airship_notification
                     }).save(cb);
                   });
                 }, cb);
               }],
    notification_view_message: ['room',
                                'record_notification',
                                function(cb, results) {
                                  if(notification.action != 'Sent') {
                                    var message = {};

                                    message.message_type = 'TopLevel';
                                    message.comment = notification.message;
                                    message.notification = results.record_notification.id;
                                    message.recommendation = notification.recommendation;

                                    return Message.post(notification.room, message, false, cb);
                                  } else {
                                    return cb();
                                  }
                                }]
  }, function(err, results) {
       if(err)
         return cb(err);

       return cb(null, results.record_notification);
     });
};

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
};

Notification.getForUser = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_user, [user_id], function(err, res) {
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
};

Notification.resolveMessage = function(message_id, cb) {
  db.query(sql_resolve_message, [message_id], function(err, res) {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb(Error.ResourceNotFound());

    return cb(null, res.rows[0].id);
  });
};

Notification.ack = function(user_id, notification_id, cb) {
  db.query(sql_ack, [user_id, notification_id], function(err, res) {
    if(err)
      return cb(err);

    Notification.get(notification_id, function(err, notification) {
      if(err)
        return cb(err);

      return cb(null, notification);
    });
  });
};

Notification.ackMessage = function(user_id, message_id, cb) {
  Notification.resolveMessage(message_id, function(err, notification_id) {
    if(err)
      return cb(err);

    return Notification.ack(user_id, notification_id, cb);
  });
};

Notification.issueForRoom = function(notification, cb) {
  return Notification.create(notification, cb);
};

Notification.issueForRoomExcept = function(notification, user_id, cb) {
  notification.exclude = user_id;
  return Notification.create(notification, cb);
};

Notification.issueForUser = function(notification, user_id, cb) {
  notification.specific = user_id;
  return Notification.create(notification, cb);
};

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
};

Notification.registerForPush = function(user_id, token, cb) {
  User.get(user_id, function(err, user) {
    if(err)
      return cb(err);

    db.query(sql_register_push, [user_id, token], function(err, res) {
      if(err)
        return cb(err);

      return cb(null, user);
    });
  });
};

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
};

Notification.publicize = function(model) {
  if(model.object) delete model.object;
  if(model.subject) delete model.subject;
  if(model.exclude) delete model.exclude;
  if(model.specific) delete model.specific;

  if(model.notified_user) User.publicize(model.notified_user);
  if(model.room) Room.publicize(model.room);
  if(model.objects) model.objects.map(global[model.object_class].publicize);
  if(model.subjects) model.subjects.map(global[model.subject_class].publicize);
  if(model.auxiliary_object) global[model.auxiliary_object_class].publicize(model.auxiliary_object);
  if(model.auxiliary_subject) global[model.auxiliary_subject_class].publicize(model.auxiliary_subject);

  return model;
};

var airship = new UrbanAirshipPush(config.airship);

function airship_transport_send_device(notification, token, cb) {
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

    console.log('Airship job completed successfully');
    return cb(null, data);
  });
}

Notification.send = function(user_id, room_id, notification, cb) {
  async.auto({
    user: User.get.bind(null, user_id),
    room: Room.get.bind(null, room_id),
    tokens: ['user', Notification.getDeviceTokensForUser.bind(null, user_id)],
    user_ok_for_push: ['user', User.isPushOK.bind(null, user_id)],
    room_ok_for_push: ['user', 'room', Room.isPushOK.bind(null, user_id, room_id)],
    send: ['tokens',
           'user_ok_for_push',
           'room_ok_for_push',
           function(cb, results) {
             if (results.user_ok_for_push && results.room_ok_for_push) {
               async.map(results.tokens, function(token, cb) {
                 return airship_transport_send_device(notification, token, cb);
               }, cb);
             } else {
               return cb();
             }
           }]
  }, cb);
};

module.exports = function() {};
