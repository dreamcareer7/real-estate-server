require('../connection.js');
require('../../lib/models/index.js')();

var UrbanAirshipPush = require('urban-airship-push');
var async = require('async');
var queue = require('kue').createQueue();
var config = require('../../lib/config.js');
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

    console.log('Job completed successfully');
    return cb(null, data);
  });
}

function airship_transport_send(user_id, room_id, notification, cb) {
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
}


queue.process('airship_transport_send', function(job, done) {
  console.log('New Job');
  airship_transport_send(job.data.user_id, job.data.room_id, job.data.airship_notification, done);
});