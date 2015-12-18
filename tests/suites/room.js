var room = require('./data/room.js');
var room_response = require('./expected_objects/room.js');
var info_response = require('./expected_objects/info.js');

var updated_room = 'updated_title';

var create = (cb) => {
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
    });
}

var getRoom = (cb) => {
  return frisby.create('get room')
    .get('/rooms/' + results.room.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: results.room.create.data
    })
    .expectJSONTypes({
      code: String,
      data: room_response
    });
}

var getRoomMedia = (cb) => {
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
    });
}

var getUserRooms = (cb) => {
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
    });
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
    .expectJSONTypes({
      code: String,
      data: [room_response],
      info: info_response
    });
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
    .expectJSONTypes({
      code: String,
      data: [room_response],
      info: info_response
    });
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
    .expectJSONTypes({
      code: String,
      data: [room_response],
      info: info_response
    });
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
    .expectJSONTypes({
      code: String,
      data: [room_response],
      info: info_response
    });
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
    .expectJSONTypes({
      code: String,
      data: [room_response],
      info: info_response
    });
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
    .expectJSONTypes({
      code: String,
      data: [room_response],
      info: info_response
    });
}

var addUser = (cb) => {
  return frisby.create('add user to a room')
    .post('/rooms/' + results.room.create.data.id + '/users', {
      user_id: results.authorize.token.data.id
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: room
    })
    .expectJSONTypes({
      code: String,
      data: room_response
    });
}

var removeUser = (cb) => {
  return frisby.create('remove user from a room')
    .delete('/rooms/' + results.room.create.data.id + '/users/' + results.authorize.token.data.id)
    .after(cb)
    .expectStatus(204);
}

var removeUserWorked = (cb) => {
  return frisby.create('get a user\'s rooms')
    .get('/rooms')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [],
      info: {
        count: results.room.getUserRooms.info.count - 1
      }
    })
    .expectJSONTypes({
      code: String,
      data: [room_response],
      info: info_response
    });
}

var patchRoom = (cb) => {
  room.title = updated_room;
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
    });
}

var patchRoomWorked = (cb) => {
  //room.title = updated_room;
  return frisby.create('get room')
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
    });
}

var removeUser = (cb) => {
  return frisby.create('remove user from a room')
    .delete('/rooms/' + results.room.create.data.id + '/users/' + results.authorize.token.data.id)
    .expectStatus(204)
    .after(cb);
}

var deleteRoom = (cb) => {
  return frisby.create('delete room')
    .delete('/rooms/' + results.room.create.data.id)
    .expectStatus(204)
    .after(cb);
}

var deleteRoomWorked = (cb) => {
  return frisby.create('get room')
    .get('/rooms/' + results.room.create.data.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      data:{
        deleted_at: Number
      }
    })
    .expectJSONTypes({
      code: String,
      data: room_response
    });
}

module.exports = {
  create,
  getRoom,
  getRoomMedia,
  getUserRooms,
  searchByUser,
  searchByFirstName,
  searchByLastName,
  searchByEmail,
  searchByPhone,
  searchByTitle,
  addUser,
  removeUser,
  removeUserWorked,
  patchRoom,
  patchRoomWorked,
  removeUser,
  deleteRoom,
  deleteRoomWorked
};