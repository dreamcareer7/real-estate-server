/**
 * @namespace Notification
 */

var async                 = require('async');
var _u                    = require('underscore');
var UrbanAirshipPush      = require('urban-airship-push');
var EventEmitter          = require('events').EventEmitter;
var debug                 = require('debug')('rechat:notifications');
var moment                = require('moment-timezone');
var sprintf               = require('sprintf-js').sprintf;
var validator             = require('../utils/validator.js');
var db                    = require('../utils/db.js');
var config                = require('../config.js');
var sql                   = require('../utils/require_sql.js');

Notification = new EventEmitter;

Orm.register('notification', Notification);

var sql_get               = require('../sql/notification/get.sql');
var sql_insert            = require('../sql/notification/insert.sql');
var sql_ack               = require('../sql/notification/ack.sql');
var sql_ack_room          = require('../sql/notification/ack_room.sql');
var sql_ack_type          = require('../sql/notification/ack_type.sql');
var sql_ack_task          = require('../sql/notification/ack_task.sql');
var sql_ack_tasks         = require('../sql/notification/ack_tasks.sql');
var sql_ack_transaction   = require('../sql/notification/ack_transaction.sql');
var sql_ack_transactions  = require('../sql/notification/ack_transactions.sql');
var sql_ack_contact       = require('../sql/notification/ack_contact.sql');
var sql_ack_contacts      = require('../sql/notification/ack_contacts.sql');
var sql_ack_alert         = require('../sql/notification/ack_alert.sql');
var sql_resolve_message   = require('../sql/notification/resolve_message.sql');
var sql_user              = require('../sql/notification/user.sql');
var sql_register_push     = require('../sql/notification/register_push.sql');
var sql_unregister_push   = require('../sql/notification/unregister_push.sql');
var sql_device_tokens     = require('../sql/notification/device_tokens.sql');
var sql_summary           = require('../sql/notification/summary.sql');
var sql_insert_user       = require('../sql/notification/insert_user.sql');
var sql_insert_delivery   = require('../sql/notification/insert_delivery.sql');
var sql_unread            = require('../sql/notification/unread.sql');
var sql_unread_room       = require('../sql/notification/unread_room.sql');
var sql_delete_by_context = require('../sql/notification/delete_by_context.sql');


Notification.object_enum = [
  'Recommendation',
  'Listing',
  'Message',
  'Comment',
  'Room',
  'HotSheet',
  'Photo',
  'Video',
  'Document',
  'Tour',
  'Co-Shopper',
  'Price',
  'Status',
  'User',
  'Alert',
  'Invitation',
  'Task',
  'Transaction',
  'Contact',
  'Attachment',
  'CMA',
  'OpenHouse'
];

Notification.action_enum = [
  'Liked',
  'Composed',
  'Edited',
  'Added',
  'Removed',
  'Posted',
  'Favorited',
  'Changed',
  'Created',
  'CreatedFor',
  'Shared',
  'Arrived',
  'Toured',
  'Accepted',
  'Declined',
  'Joined',
  'Left',
  'Archived',
  'Deleted',
  'Opened',
  'Closed',
  'Pinned',
  'Sent',
  'Invited',
  'BecameAvailable',
  'PriceDropped',
  'StatusChanged',
  'TourRequested',
  'IsDue',
  'Assigned',
  'Withdrew',
  'Attached',
  'Detached',
  'Available'
];

var schema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: Notification.action_enum,
      required: true
    },

    object_class: {
      type: 'string',
      enum: Notification.object_enum,
      required: true
    },

    subject_class: {
      type: 'string',
      enum: Notification.object_enum,
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
      enum: Notification.object_enum,
      required: false
    },

    auxiliary_subject: {
      type: 'string',
      uuid: true,
      required: false
    },

    auxiliary_subject_class: {
      type: 'string',
      enum: Notification.object_enum,
      required: false
    },

    recommendation: {
      type: 'string',
      uuid: true,
      required: false
    }
  }
};

var ack_type_schema = {
  type: 'object',
  properties: {
    subjects: {
      required: true,
      type: 'array',
      uniqueItems: true,
      minItems: 1,
      items: {
        enum: Notification.object_enum
      }
    },
    actions: {
      required: true,
      type: 'array',
      uniqueItems: true,
      minItems: 1,
      items: {
        enum: Notification.action_enum
      }
    },
    objects: {
      required: true,
      type: 'array',
      uniqueItems: true,
      minItems: 1,
      items: {
        enum: Notification.object_enum
      }
    }
  }
};

var validate = validator.bind(null, schema);

// SQL queries to work with recommendation objects

function create(notification, cb) {
  validate(notification, err => {
    if (err)
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
      if (err)
        return cb(err);

      Notification.get(res.rows[0].id, function(err, notification) {
        if (err)
          return cb(err);

        cb(null, notification);
      });
    });
  });
}

Notification.get = function(id, cb) {
  db.query(sql_get, [id], function(err, res_base) {
    if (err) {
      return cb(err);
    }

    if (res_base.rows.length < 1)
      return cb(Error.ResourceNotFound('Notification not ' + id + ' found'));

    var notification = res_base.rows[0];

    cb(null, notification);
  });
};

Notification.schedule = function(notification, cb) {
  if(!notification.delay)
    notification.delay = 0;

  var job = Job.queue.create('create_notification', {
    notification: notification
  }).removeOnComplete(true);
  job.delay(notification.delay);

  process.domain.jobs.push(job);
  return cb(null, {});
};

insertForUser = function(notification_id, user_id, cb) {
  db.query(sql_insert_user, [notification_id, user_id], cb);
};

Notification.create = function(notification, cb) {
  var getUsers = (cb) => {
    if(notification.room) {
      debug('>>> (Notification::create::getUsers) Issuing for room:', notification.room);

      Room.getUsersIDs(notification.room, function(err, ids) {
        if (err)
          return cb(err);

        if (notification.specific) {
          debug('>>> (Notification::create::getUsers) Issuing for this user on room:', notification.specific);
          return cb(null, [notification.specific]);
        }

        debug('>>> (Notification::create::getUsers) Issuing for following users:', ids);
        return cb(null, ids);
      });
    } else if (notification.specific) {
      debug('>>> (Notification::create::getUsers) Issuing for this user:', notification.specific);
      return cb(null, [notification.specific]);
    } else {
      debug('>>> (Notification::create::getUsers) Issuing for no one');
      return cb(null, []);
    }
  };

  var push = (user_id, populated, cb) => {
    var airship = _u.clone(populated);
    airship.notification_id = populated.id;
    airship.recommendation = populated.recommendation ? populated.recommendation.id : null;

    var send = () => {
      Socket.send('Notification', user_id, [airship], (err) => {
        // If user is online, we will not send a push notification.
        // We will give user a little while because he probably has got in-app notifications
        // If user doesnt read the notification,
        // in a little while, Notification.sendPushForUnread will pick this up and send push notification
        if (!err)
          return cb();

        if (user_id == notification.exclude)
          return cb();

        Notification.summary(user_id, function(err, summary) {
          airship.badge_count = parseInt(summary.total_notification_count) || 0;
          Notification.send(user_id, airship, cb);
        });
      });
    };

    if (user_id == notification.exclude)
      return send();

    insertForUser(populated.id, user_id, (err) => {
      if(err)
        return cb(err);

      send();
    });
  };

  var pushToAll = (cb, results) => {
    debug('>>> (Notification::create::pushToAll) Sending push to users:', results.users);
    async.map(results.users, (user_id, cb) => push(user_id, results.populated, cb), cb);
  };

  var sendViewMessage = (cb, results) => {
    if(!results.room) {
      debug('>>> (Notification::create::sendViewMessage) NOT A ROOM');
      return cb();
    }

    if (notification.action === 'Sent') {
      debug('>>> (Notification::create::sendViewMessage) No need to create a NotifcationViewMessage for a Message');
      return cb();
    }

    var message = {};

    message.message_type = 'TopLevel';
    message.comment = notification.message;
    message.notification = results.saved.id;
    message.recommendation = notification.recommendation;

    debug('>>> (Notification::create::sendViewMessage) Issuing NotificationViewMessage for room:', notification.room, 'Message:', JSON.stringify(message));
    return Message.post(notification.room, message, false, cb);
  };

  var done = (err, results) => {
    if (err)
      return cb(err);

    return cb(err, results.saved);
  };

  var getRoom = (notification, cb) => {
    if(!notification.room)
      return cb();

    return Room.get(notification.room, cb);
  };

  async.auto({
    room: cb => getRoom(notification, cb),
    saved: [
      'room',
      cb => {
        create(notification, cb);
      }
    ],
    populated: [
      'saved',
      (cb, results) => {
        Orm.populate(results.saved, {}, cb);
      }
    ],
    users: [
      'room',
      getUsers
    ],
    send: [
      'populated',
      'users',
      pushToAll
    ],
    view_message: [
      'room',
      'saved',
      sendViewMessage
    ],
    log: [
      'saved',
      (cb, results) => {
        console.log('<- (Notification-Driver) Successfully created a notification with id:'.grey, results.saved.id);
        return cb();
      }
    ]
  }, done);
};

Notification.getDeviceTokensForUser = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if (err)
      return cb(err);

    db.query(sql_device_tokens, [user_id], function(err, res) {
      if (err)
        return cb(err);

      var tokens = res.rows.map(function(r) {
        return r.device_token;
      });

      debug('>>> (Notification::getDeviceTokensForUser)', '#', user.id, user.first_name, user.last_name, ('(' + user.email+ ')'), '=>', tokens);
      return cb(null, tokens);
    });
  });
};

Notification.getForUser = function(user_id, paging, cb) {
  User.get(user_id, function(err, user) {
    if (err)
      return cb(err);

    db.query(sql_user, [
      user_id,
      paging.type,
      paging.timestamp,
      paging.limit
    ], function(err, res) {
      if (err)
        return cb(err);

      if (res.rows.length < 1)
        return cb(null, []);

      var notification_ids = res.rows.map(function(r) {
        return r.id;
      });

      async.map(notification_ids, Notification.get, function(err, notifications) {
        if (err)
          return cb(err);

        if (res.rows.length > 0)
          notifications[0].total = res.rows[0].total;

        return cb(null, notifications);
      });
    });
  });
};

Notification.resolveMessage = function(message_id, cb) {
  db.query(sql_resolve_message, [message_id], function(err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound());

    return cb(null, res.rows[0].id);
  });
};

Notification.ack = function(user_id, notification_id, cb) {
  Notification.get(notification_id, function(err, notification) {
    if (err)
      return cb(err);
    db.query(sql_ack, [user_id, notification_id], function(err, res) {
      if (err)
        return cb(err);

      Notification.get(notification_id, function(err, notification) {
        if (err)
          return cb(err);

        return cb(null, notification);
      });
    });
  });
};

Notification.ackMessage = function(user_id, message_id, cb) {
  Notification.resolveMessage(message_id, function(err, notification_id) {
    if (err)
      return cb(err);

    return Notification.ack(user_id, notification_id, cb);
  });
};

Notification.ackRoom = function(user_id, room_id, cb) {
  User.get(user_id, err => {
    if(err)
      return cb(err);

    Room.get(room_id, err => {
      if(err)
        return cb(err);

      db.query(sql_ack_room, [user_id, room_id], cb);
    });
  });
};

Notification.ackType = function (user_id, room_id, type, cb) {
  async.auto({
    validate: cb => {
      return validator(ack_type_schema, type, cb);
    },
    user: cb => {
      return User.get(user_id, cb);
    },
    room: cb => {
      return Room.get(room_id, cb);
    },
    ack: [
      'validate',
      'user',
      'room',
      cb => {
        db.query(sql_ack_type, [
          user_id,
          room_id,
          type.subjects,
          type.actions,
          type.objects
        ], cb);
      }
    ]
  }, cb);
};

Notification.ackTransactions = function(user_id, cb) {
  User.get(user_id, err => {
    if(err)
      return cb(err);

    db.query(sql_ack_transactions, [user_id], cb);
  });
};

Notification.ackTransaction = function(transaction_id, user_id, cb) {
  User.get(user_id, err => {
    if(err)
      return cb(err);

    Transaction.get(transaction_id, err => {
      if(err)
        return cb(err);

      db.query(sql_ack_transaction, [transaction_id, user_id], cb);
    });
  });
};

Notification.ackTasks = (user_id, cb) => {
  User.get(user_id, err => {
    if(err)
      return cb(err);

    db.query(sql_ack_tasks, [user_id], cb);
  });
};

Notification.ackTask = (task_id, user_id, cb) => {
  User.get(user_id, err => {
    if(err)
      return cb(err);

    Task.get(task_id, err => {
      if(err)
        return cb(err);

      db.query(sql_ack_task, [task_id, user_id], cb);
    });
  });
};

Notification.ackContacts = (user_id, cb) => {
  User.get(user_id, err => {
    if(err)
      return cb(err);

    db.query(sql_ack_contacts, [user_id], cb);
  });
};

Notification.ackContact = (contact_id, user_id, cb) => {
  User.get(user_id, err => {
    if(err)
      return cb(err);

    Contact.get(contact_id, err => {
      if(err)
        return cb(err);

      db.query(sql_ack_contact, [contact_id, user_id], cb);
    });
  });
};

Notification.ackAlert = (user_id, alert_id, cb) => {
  User.get(user_id, err => {
    if(err)
      return cb(err);

    Alert.get(alert_id, err => {
      if(err)
        return cb(err);

      db.query(sql_ack_alert, [user_id, alert_id], cb);
    });
  });
};

Notification.deleteByContext = (entity_type, entity_id, cb) => {
  db.query(sql_delete_by_context, [entity_type, entity_id], cb);
};


Notification.issueForRoom = function(notification, cb) {
  debug('>>> (Notification::issueForRoom)', 'Notification Object:', JSON.stringify(notification));
  return Notification.schedule(notification, cb);
};

Notification.issueForRoomExcept = function(notification, user_id, cb) {
  debug('>>> (Notification::issueForRoomExcept)', 'Notification Object:', JSON.stringify(notification), 'Except:', user_id);
  notification.exclude = user_id;
  return Notification.schedule(notification, cb);
};

Notification.issueForUser = function(notification, user_id, cb) {
  debug('>>> (Notification::issueForUser)', 'Notification Object:', JSON.stringify(notification), 'Specific:', user_id);
  notification.specific = user_id;
  return Notification.schedule(notification, cb);
};

Notification.issueForUsers = function(notification, users, overrides, cb) {
  debug('>>> (Notification::issueForUsers)', 'Notification Object:', JSON.stringify(notification), 'For users:', users);
  async.map(users, (r, cb) => {
    var n = _u.clone(notification);
    n.specific = r;
    n = Notification.override(n, overrides, r);

    return Notification.schedule(n, cb);
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, results);
  });
};

Notification.issueForUsersExcept = function(notification, users, user_id, overrides, cb) {
  debug('>>> (Notification::issueForUsersExcept)', 'Notification Object:', JSON.stringify(notification), 'For users:', users);
  async.map(users, (r, cb) => {
    if (r == user_id)
      return cb();

    var n = _u.clone(notification);
    n.specific = r;
    n = Notification.override(n, overrides, r);

    return Notification.schedule(n, cb);
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, results);
  });
};

Notification.override = function(notification, overrides, entity) {
  if(overrides.subject)
    notification.subject = entity;

  if(overrides.object)
    notification.object = entity;

  return notification;
};

Notification.summary = function(user_id, cb) {
  User.get(user_id, function(err, user) {
    if (err)
      return cb(err);

    db.query(sql_summary, [user_id], function(err, res) {
      if (err)
        return cb(err);

      return cb(null, res.rows[0]);
    });
  });
};

Notification.registerForPush = function(user_id, device, token, cb) {
  if(!token)
    return cb(Error.Validation('Token cannot be null'));

  if(!device)
    return cb(Error.Validation('Device ID cannot be null'));

  async.auto({
    user: cb => {
      return User.get(user_id, cb);
    },
    register: [
      cb => {
        db.query(sql_register_push, [user_id, device, token], cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, results.user);
  });
};

Notification.unregisterForPush = function(user_id, token, cb) {
  User.get(user_id, function(err, user) {
    if (err)
      return cb(err);

    db.query(sql_unregister_push, [user_id, token], function(err, res) {
      if (err)
        return cb(err);

      return cb(null, user);
    });
  });
};

Notification.publicize = function(model) {
  if (model.total) delete model.total;
  if (model.exclude) delete model.exclude;
  if (model.specific) delete model.specific;

  return model;
};

var airship = new UrbanAirshipPush(config.airship);

Notification.sendToDevice = function(notification, token, user_id, cb) {
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

  airship.push.send(pushInfo, function(err, data) {
    if (err) {
      console.log('<- (Airship-Transport) Error sending push notification to'.red, token, ':', err);
      return cb();
    }

    console.log('<- (Airship-Transport) Successfully sent a push notification to device'.green, token);
    cb(null, data);
  });
};

Notification.saveDelivery = function(n, u, token, type, cb) {
  db.query(sql_insert_delivery, [n,u,token,type], cb);
};

Notification.getUnreadForRoom = function(user_id, room_id, cb) {
  db.query(sql_unread_room, [user_id, room_id], (err, res) => {
    if(err)
      return cb(err);

    cb(null, res.rows);
  });
}

Notification.sendPushForUnread = function(cb) {
  var sendSingle = (payload, cb) => {
    Notification.get(payload.notification, (err, notification) => {
      if(err) {
        console.log('Cannot get notification', notification, err);
        cb(err);
        return ;
      }

    var airship = _u.clone(notification);
    airship.notification_id = notification.id;
    airship.recommendation = notification.recommendation ? notification.recommendation.id : null;

    Notification.summary(payload.user, function(err, summary) {
        airship.badge_count = parseInt(summary.total_notification_count) || 0;
        Notification.send(payload.user, airship, cb);
      });
    });
  };

  db.query(sql_unread, [], (err, res) => {
    if(err)
      return cb(err);

    if(res.rows.length < 1)
      return cb();

    async.map(res.rows, (set, cb) => {
      Notification.getDeviceTokensForUser(set.user, (err, tokens) => {
        if(err)
          return cb(err);

        if(tokens.length < 1)
          return cb();

        async.map(set.notifications, (n, cb) => {
          sendSingle({
            notification:n,
            user: set.user
          }, cb);
        }, cb);
      });
    }, cb);
  });
};

Notification.send = function(user_id, notification, cb) {
  var room_id = notification.room;

  var send = (cb, results) => {
    var delay = 0;

    if (!Notification.isSystemGenerated(notification)) {
      debug('>>> (Notification::send) User-generated notification:',
            Notification.getFormattedForLogs(notification),
            'scheduling now for user:', user_id, 'on room:', room_id);
      delay = 0;
    }
    else {
      delay = (results.user_ok_for_push < 0) ? 0 : results.user_ok_for_push;
      debug('>>> (Notification::send) System-generated notification:',
            Notification.getFormattedForLogs(notification),
            'scheduling in', delay, 'for user:', user_id, 'on room:', room_id);
    }

    if (!results.room_ok_for_push && Notification.isSystemGenerated(notification)) {
      debug('>>> (Notification::send) Room is muted. Not sending System-generated notification:',
            Notification.getFormattedForLogs(notification),
            'for user:', user_id, 'on room:', room_id);
      return cb();
    }

    async.map(results.tokens, (token, cb) => {
      Notification.saveDelivery(notification.notification_id, user_id, token, 'airship', (err) => {
        if(err) {
          console.log('⚠ Cannot save notification delivery for notification:', notification.notification_id, 'user:', user_id, err);
          return cb(err);
        }

        var job = Job.queue.create('airship_transport_send_device', {
          notification: notification,
          token: token,
          user_id:user_id
        }).removeOnComplete(true);

        if (delay > 0)
          job.delay(delay);

        debug('>>> (Notification::send) Job pushed to domain for user:', user_id, 'on room:', room_id,
              'notification:', Notification.getFormattedForLogs(notification));
        process.domain.jobs.push(job);
        console.log('⇪ (Airship-Transport) scheduled a notification'.green,
                    Notification.getFormattedForLogs(notification),
                    'for user', User.getFormattedForLogs(results.user),
                    'on room', '#' + (results.room ? results.room.title : 'N/A'.red),
                    ('(' + (results.room ? results.room.id : 'N/A') + ')').blue,
                    ('delay +' + delay).red, 'token:', token.yellow);
        return cb();
      });
    }, cb);
  };

  var determineSeamlessEmailType = (cb, results) => {
    if(results.tokens.length > 0) {
      // If there is a token, it means we've sent push notifications.
      // So we don't want to send EMail/SMS.
      return cb();
    }

    return cb(null, results);
  };

  var getRoom = (room_id, cb) => {
    if(!room_id)
      return cb();

    return Room.get(room_id, cb);
  };

  var roomOkForPush = (user_id, room_id, cb) => {
    if(!room_id)
      return cb(null, true);

    return Room.isPushOK(user_id, room_id, cb);
  };

  async.auto({
    user: User.get.bind(null, user_id),
    room: (cb) => getRoom(room_id, cb),
    tokens: ['user', Notification.getDeviceTokensForUser.bind(null, user_id)],
    user_ok_for_push: ['user', User.isPushOK.bind(null, user_id)],
    room_ok_for_push: ['user', 'room', (cb, results) => roomOkForPush(user_id, room_id, cb)],
    send: [
      'user',
      'room',
      'tokens',
      'user_ok_for_push',
      'room_ok_for_push',
      send
    ]
  }, cb);
};

Notification.getFormattedForLogs = function(notification) {
 var subject_class = notification.subject_class;
 var action = notification.action;
 var object_class = notification.object_class;

 return ((subject_class ? subject_class.yellow : 'None' ) + '::' +
         (action ? action.yellow : 'None') + '::' +
         (object_class ? object_class.yellow : 'None'));
};

Notification.isSystemGenerated = function(notification) {
  if (notification.action == 'BecameAvailable' ||
      notification.action == 'PriceDropped' ||
      notification.action == 'Available' ||
      notification.action == 'StatusChanged')
    return true;

  return false;
};

Notification.associations = {
  recommendation: {
    optional: true,
    model: 'Recommendation'
  },

  recommendations: {
    collection:true,
    model: 'Recommendation',
    ids: (n, cb) => {
      if(n.recommendation)
        return cb(null, [n.recommendation]);

      return cb();
    }
  },

  objects: {
    collection:true,
    model: (n, cb) => cb(null, n.object_class),
    ids: (n, cb) => {
      if(n.object_class === 'Room' || n.object_class === 'Message')
        return cb();

      if(n.object)
        return cb(null, [n.object]);
      return cb();
    }
  },

  subjects: {
    collection:true,
    model: (n, cb) => cb(null, n.subject_class),
    ids: (n, cb) => {
      if(n.subject_class === 'Room' || n.subject_class === 'Message')
        return cb();

      if(n.subject)
        return cb(null, [n.subject]);

      return cb();
    }
  },

  auxiliary_object: {
    optional:true,
    model: (n, cb) => cb(null, n.auxiliary_object_class),
    id: (n, cb) =>{
      if(n.auxiliary_object_class === 'Room' || n.auxiliary_object_class === 'Message')
        return cb();

      return cb(null, n.auxiliary_object);
    }
  },

  auxiliary_subject: {
    optional:true,
    model: (n, cb) => cb(null, n.auxiliary_subject_class),
    id: (n, cb) =>{
      if(n.auxiliary_subject_class === 'Room' || n.auxiliary_subject_class === 'Message')
        return cb();

      return cb(null, n.auxiliary_subject);
    }
  }
};

module.exports = function() {

};
