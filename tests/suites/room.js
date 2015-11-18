var room = require('./data/room.js');

var create = (cb) => {
  return frisby.create('create room')
    .post('/rooms', room)
    .expectStatus(200)
    .after(cb)
    .expectJSON({
      code: 'OK',
      data: room
    })
}

var get = (cb) => {
  return frisby.create('get room')
    .get('/rooms/' + results.room.create.data.id)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.room.create.data
    })
    .after(cb);
}

var del = (cb) => {
  return frisby.create('delete room')
    .delete('/rooms/' + results.room.create.data.id)
    .expectStatus(204)
    .after(cb);
}

var removeUser = (cb) => {
  return frisby.create('remove user from a room')
    .delete('/rooms/' + results.room.create.data.id + '/users/' + results.authorize.token.data.id)
    .expectStatus(204)
    .after(cb);
}

var addUser = (cb) => {
  return frisby.create('add user to a room')
    .post('/rooms/' + results.room.create.data.id + '/users', {
      user_id: results.authorize.token.data.id
    })
    .expectStatus(200)
    .after(cb);
}

var getUserRooms = (cb) => {
  return frisby.create('get a user\'s rooms')
    .get('/rooms')
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
    .after(cb);
}

var searchByUser = (cb) => {
  return frisby.create('search rooms by user')
    .get('/rooms/search?users=' + results.room.create.data.owner.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'room'
        }
      ]
    })
    .expectJSONLength('data', 1);
}

var searchByFirstName = (cb) => {
  return frisby.create('search rooms by owner\'s firstname')
    .get('/rooms/search?q=' + results.room.create.data.owner.first_name)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'room'
        }
      ]
    })
    .expectJSONLength('data', 1);
}

var searchByLastName = (cb) => {
  return frisby.create('search rooms by owner\'s lastname')
    .get('/rooms/search?q=' + results.room.create.data.owner.last_name)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'room'
        }
      ]
    })
    .expectJSONLength('data', 1);
}

var searchByEmail = (cb) => {
  return frisby.create('search rooms by owner\'s email')
    .get('/rooms/search?q=' + results.room.create.data.owner.email)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'room'
        }
      ]
    })
    .expectJSONLength('data', 1);
}

var searchByPhone = (cb) => {
  return frisby.create('search rooms by owner\'s phone number')
    .get('/rooms/search?q=' + results.room.create.data.owner.phone_number)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'room'
        }
      ]
    })
    .expectJSONLength('data', 1);
}

var searchByTitle = (cb) => {
  return frisby.create('search rooms by title')
    .get('/rooms/search?q=' + results.room.create.data.title)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [
        {
          type: 'room'
        }
      ]
    })
    .expectJSONLength('data', 1);
}

module.exports = {
  create,
  get: get,
  getUserRooms,
  addUser,
  getUserRoomsAgain: getUserRooms,
  searchByUser,
  searchByFirstName,
  searchByLastName,
  searchByEmail,
  searchByPhone,
  searchByTitle,
  removeUser,
  delete: del
};