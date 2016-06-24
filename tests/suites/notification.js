var config = require('../../lib/config.js');

var authorize_reponse = require('./data/user.js');
var user = require('./data/user.js');
var room = require('./data/room.js');

registerSuite('transaction', ['create', 'assign']);

var auth_params = {
  client_id: config.tests.client_id,
  client_secret: config.tests.client_secret,
  username: user.email,
  password: user.password,
  grant_type: 'password'
};

var token = (cb) => {
  return frisby.create('get token')
    .post('/oauth2/token', auth_params)
    .expectStatus(200)
    .after((err, res, json) => {
      var setup = frisby.globalSetup();

      setup.request.headers['Authorization'] = 'Bearer ' + json.access_token;

      frisby.globalSetup(setup);
      cb(err, res);
    })
}

var notification_response = require('./expected_objects/notification.js');
var info_response = require('./expected_objects/info.js');
var user_response = require('./expected_objects/user.js');
var uuid = require('node-uuid');

var getUsersNotification = (cb) => {
  return frisby.create('get all notifications for a user')
    .get('/notifications')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'notification'
        }
      ],
      info: {}
    })
    .expectJSONTypes({
      code: String,
      data: [notification_response],
      info: info_response
    })
}

var getNotification = (cb) => {
  return frisby.create('get a notification by id')
    .get('/notifications/' + results.notification.getUsersNotification.data[0].id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'notification'
      }
    })
    .expectJSONTypes({
      code: String,
      data: notification_response
    });
}

var getNotification404 = (cb) => {
  return frisby.create('expect 404 with invalid notification id')
    .get('/notifications/' + uuid.v1())
    .after(cb)
    .expectStatus(404);
}

var acknowledgeNotification = (cb) => {
  return frisby.create('acknowledge notification')
    .delete('/notifications/' + results.notification.getUsersNotification.data[0].id)
    .after(cb)
    .expectStatus(204)
}

var acknowledgeNotification404 = (cb) => {
  return frisby.create('expect 404 with invalid notification id')
    .delete('/notifications/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

var pushNotification = (cb) => {
  var token = require('./data/token.js')
  var token_model = JSON.parse(JSON.stringify(token));
  return frisby.create('register push')
    .post('/notifications/tokens', token_model)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'user'
      }

    })
    .expectJSONLength(2)
    .expectJSONTypes({
      code: String,
      data: user_response
    });
}

var cancelPushNotification = (cb) => {
  return frisby.create('cancel push')
    .delete('/notifications/tokens/' + results.notification.pushNotification.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        type: 'user'
      }

    })
    .expectJSONLength(2)
    .expectJSONTypes({
      code: String,
      data: user_response
    });
}

var patchNotificationSettings = (cb) => {
  console.log(results)
  return frisby.create('update notification settings')
    .patch('/rooms/' + results.notification.createRoom.data.id + '/notifications', {
      notification: true
    })
    .after(cb)
    .expectStatus(200)
}

var patchNotificationSettings404 = (cb) => {
  return frisby.create('expect 404 with invalid notification id')
    .patch('/room/' + uuid.v1() + '/notifications', {
      notification: "true"
    })
    .after(cb)
    .expectStatus(404)
}

var createRoom = (cb) => {
  return frisby.create('create room')
    .post('/rooms', room)
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  token,
  getUsersNotification,
  getNotification,
  getNotification404,
  acknowledgeNotification,
  acknowledgeNotification404,
  pushNotification,
  cancelPushNotification,
  createRoom,
  patchNotificationSettings,
  patchNotificationSettings404
}
