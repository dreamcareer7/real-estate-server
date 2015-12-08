//register dependencies
registerSuite('room', ['create']);
registerSuite('invitation', ['create']);


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
}

var acknowledgeNotification = (cb) => {
  return frisby.create('acknowledge notification')
    .delete('/notifications/' + results.notification.getUsersNotification.data[0].id)
    .after(cb)
    .expectStatus(204)
}

var acknowledgeNotificationWorked = (cb) => {
  return frisby.create('make sure acknowledgeNotification was successful')
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
      info: {
        count: results.notification.getUsersNotification.info.count - 1
      }
    })
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
    .expectJSONLength(2);
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
    .expectJSONLength(2);
}

var patchNotificationSettings = (cb) => {
  return frisby.create('update notification settings')
    .patch('/room/' + results.room.create.data.id + '/notifications', {
      notification: "true"
    })
    .after(cb)
    .expectStatus(204)
}


module.exports = {
  getUsersNotification,
  getNotification,
  acknowledgeNotification,
  acknowledgeNotificationWorked,
  pushNotification,
  cancelPushNotification,
  patchNotificationSettings
}
