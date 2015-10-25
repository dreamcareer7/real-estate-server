var criteria = require('./data/alert_criteria.js');
var room;

var createRoom = (cb) => {
  var create = require('./room.js').createRoom;
  var fn = create((err, json) => {
    room = json.data;
    cb(null, json);
  })

  return fn;
}

var createAlert = (cb) => {
  return frisby.create('create alert')
         .post('/rooms/' + room.id + '/alerts', criteria)
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
  createRoom,
  createAlert,
  vAlert
}