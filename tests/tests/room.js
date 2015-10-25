var room    = require('./data/room.js');

var create = (cb) => {
  return frisby.create('create room')
         .post('/rooms', room)
         .expectStatus(201)
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
         .delete('/rooms/' + results.room.create.data.id+'/users/'+results.authorize.token.data.id)
         .expectStatus(204)
         .after(cb);
}

var addUser = (cb) => {
  return frisby.create('add user to a room')
         .post('/rooms/' + results.room.create.data.id+'/users', {
           user_id:results.authorize.token.data.id
          })
         .expectStatus(200)
         .after(cb);
}

var getUserRooms = (cb) => {
  return frisby.create('get a user\'s rooms')
         .get('/rooms')
         .expectStatus(200)
         .expectJSON({
           code:'OK',
           data:[]
         })
         .after(cb);
}




module.exports = {
  create,
  get:get,
  getUserRooms,
  removeUser,
  addUser,
  getUserRoomsAgain:getUserRooms,
  delete:del
};