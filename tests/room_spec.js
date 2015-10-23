var room = require('./data/room.js');

var createRoom = (cb) => {
  return frisby.create('create room')
    .post('/rooms', room)
    .expectStatus(201)
    .expectJSON({
      code:'OK',
      data:room
    })
    .afterJSON(function(json) {
      room.id = json.data.id;
      cb(null, json)
    });
}

var getRoom = (cb) => {
  return frisby.create('get room')
    .get('/rooms/'+room.id)
    .expectStatus(200)
    .expectJSON({
      code:'OK',
      data:room
    })
    .after(cb);
}

var deleteRoom = (cb) => {
  return frisby.create('delete room')
    .delete('/rooms/'+room.id)
    .expectStatus(204)
    .after(cb);
}

var tasks = {
  createRoom,
  getRoom,
  deleteRoom
};

// Tests.run(tasks);

module.exports = tasks;