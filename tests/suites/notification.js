const config = require('../../lib/config.js')

const user = require('./data/user.js')
const room = require('./data/room.js')

registerSuite('room', ['create'])
registerSuite('mls', ['saveAlert', 'addListing', 'refreshListings'])

// const notification_response = require('./expected_objects/notification.js')
// const info_response = require('./expected_objects/info.js')
const user_response = require('./expected_objects/user.js')
const uuid = require('node-uuid')

const getUsersNotification = (cb) => {
  return frisby.create('get all notifications for a user')
    .get('/notifications')
    .after(cb)
    .expectStatus(200)
}

const getNotification = (cb) => {
  return frisby.create('get a notification by id')
    .get(`/notifications/${results.notification.getUsersNotification.data[0].id}`)
    .after(cb)
    .expectStatus(200)
}

const getNotification404 = (cb) => {
  return frisby.create('expect 404 with invalid notification id')
    .get(`/notifications/${uuid.v1()}`)
    .after(cb)
    .expectStatus(404)
}

const seenNotification = (cb) => {
  return frisby.create('mark a notification as seen')
    .patch(`/notifications/${results.notification.getUsersNotification.data[0].id}/seen`)
    .after(cb)
    .expectStatus(204)
}

const acknowledgeNotification = (cb) => {
  return frisby.create('acknowledge notification')
    .delete('/notifications/')
    .after(cb)
    .expectStatus(204)
}

const acknowledgeRoomNotification = (cb) => {
  return frisby.create('acknowledge room notifications')
    .delete(`/rooms/${results.room.create.data.id}/notifications`)
    .after(cb)
    .expectStatus(204)
}

const pushNotification = (cb) => {
  const token = require('./data/token.js')
  const token_model = JSON.parse(JSON.stringify(token))
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
    })
}

const cancelPushNotification = (cb) => {
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
    })
}

const patchNotificationSettings = (cb) => {
  return frisby.create('update notification settings')
    .patch('/rooms/' + results.notification.createRoom.data.id + '/notifications', {
      notification: true
    })
    .after(cb)
    .expectStatus(200)
}

const patchNotificationSettings404 = (cb) => {
  return frisby.create('expect 404 with invalid notification id')
    .patch('/room/' + uuid.v1() + '/notifications', {
      notification: true
    })
    .after(cb)
    .expectStatus(404)
}

const createRoom = (cb) => {
  return frisby.create('create room')
    .post('/rooms', room)
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  getUsersNotification,
  getNotification,
  getNotification404,
  seenNotification,
  acknowledgeNotification,
  acknowledgeRoomNotification,
  pushNotification,
  cancelPushNotification,
  createRoom,
  patchNotificationSettings,
  patchNotificationSettings404
}
