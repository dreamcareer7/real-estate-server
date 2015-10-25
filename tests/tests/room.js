var room  = require('./data/room.js');

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

module.exports = {
  create,
  get:get,
  delele:del
};