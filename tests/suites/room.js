const room = require('./data/room.js')
const room_response = require('./expected_objects/room.js')
const info_response = require('./expected_objects/info.js')
const uuid = require('node-uuid')

registerSuite('user', ['create'])

const updated_room = 'updated_title'

const create = (cb) => {
  return frisby.create('create room')
    .post('/rooms', room)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: room
    })
    .expectJSONTypes({
      code: String,
      data: room_response
    })
}

const create400 = (cb) => {
  return frisby.create('expect 400 with empty model when creating a room')
    .post('/rooms')
    .after(cb)
    .expectStatus(400)
}

const getRoom = (cb) => {
  const room = JSON.parse(JSON.stringify(results.room.create.data))
  delete room.latest_message

  return frisby.create('get room')
    .get('/rooms/' + results.room.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: room
    })
    .expectJSONTypes({
      code: String,
      data: room_response
    })
}

const getRoom404 = (cb) => {
  return frisby.create('expect 404 with invalid room id when getting a room')
    .get('/rooms/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

const getRoomMedia = (cb) => {
  return frisby.create('get room\'s media')
    .get('/rooms/' + results.room.create.data.id + '/media')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [],
      info: {}
    })
    .expectJSONTypes({
      code: String,
      data: Array,
      info: info_response
    })
}

const getRoomMedia404 = (cb) => {
  return frisby.create('expect 404 with invalid room id when getting room\'s media')
    .get('/rooms/' + uuid.v1() + '/media')
    .after(cb)
    .expectStatus(404)
}

const getUserRooms = (cb) => {
  return frisby.create('get a user\'s rooms')
    .get('/rooms')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
    .expectJSONTypes({
      code: String,
      data: [room_response],
      info: info_response
    })
}

const addUser = (cb) => {
  return frisby.create('add user to a room')
    .post('/rooms/' + results.room.create.data.id + '/users', {users: [
      results.user.create.data.id
    ]})
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: room
    })
    .expectJSONTypes({
      code: String,
      data: room_response
    })
}

const addUser400 = (cb) => {
  return frisby.create('expect 400 with empty model when adding user to a room')
    .post('/rooms/' + results.room.create.data.id + '/users')
    .after(cb)
    .expectStatus(400)
}

const removeUserFromPersonal = (cb) => {
  return frisby.create('remove user from his personal room')
    .delete('/rooms/' + results.user.create.data.personal_room + '/users/' + results.authorize.token.data.id)
    .after(cb)
    .expectStatus(406)
}

const patchRoom = (cb) => {
  room.title = updated_room
  return frisby.create('patch a room')
    .put('/rooms/' + results.room.create.data.id, room)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: room
    })
    .expectJSONTypes({
      code: String,
      data: room_response
    })
}

const patchRoom404 = (cb) => {
  return frisby.create('expect 404 with invalid toom id when updating a room')
    .put('/rooms/' + uuid.v1(), room)
    .after(cb)
    .expectStatus(404)
}

const patchRoomWorked = (cb) => {
  room.title = updated_room
  return frisby.create('make sure patching worked')
    .get('/rooms/' + results.room.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        title: updated_room
      }
    })
    .expectJSONTypes({
      code: String,
      data: room_response
    })
}

const removeUser = (cb) => {
  return frisby.create('remove user from a room')
    .delete('/rooms/' + results.room.create.data.id + '/users/' + results.authorize.token.data.id)
    .expectStatus(204)
    .after(cb)
}

const removeUserWorked = (cb) => {
  return frisby.create('make sure that we left the room')
    .get('/rooms/' + results.room.create.data.id)
    .expectStatus(403)
    .after(cb)
}

const removeUser404 = (cb) => {
  return frisby.create('expect 404 with invalid user id when removing a user from a room')
    .delete('/rooms/' + results.room.create.data.id + '/users/' + uuid.v1())
    .expectStatus(404)
    .after(cb)
}

module.exports = {
  create,
  create400,
  getRoom,
  getRoom404,
  getRoomMedia,
  getRoomMedia404,
  getUserRooms,
  addUser,
  addUser400,
  patchRoom404,
  patchRoom,
  patchRoomWorked,
  removeUser404,
  removeUser,
  removeUserWorked,
  removeUserFromPersonal,
}
