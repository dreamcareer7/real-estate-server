var criteria = require('./data/alert_criteria.js');

var createAlert = (cb) => {
  return frisby.create('create alert')
        .post('/rooms/' + results.createRoom.data.id + '/alerts', criteria)
        .after(cb)
        .expectStatus(200)
        .expectJSON({
          code: 'OK',
          data: criteria
        });
}

var vAlert = (cb) => {
  var criteria = require('./data/valert_criteria.js')
  return frisby.create('virtual alert')
         .post('/valerts', criteria)
         .expectStatus(200)
         .after(cb);
}


module.exports = {
  createRoom:require('./room.js').createRoom,
  createAlert,
  vAlert
}