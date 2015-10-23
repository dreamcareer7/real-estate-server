var Tests  = require('./Tests.js');
var criteria = require('./data/alert_criteria.js');
var vcriteria = require('./data/valert_criteria.js')
var room;
var curlify = require('request-as-curl');

var createRoom = (cb) => {
  var create = require('./room_spec.js').createRoom;
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
           code:'OK',
           data:criteria
         });
}

var vAlert = (cb) => {
  return frisby.create('virtual alert')
         .post('/valerts', vcriteria)
         .expectStatus(200)
         .after( (err, res) => {
           //     console.log(curlify(res.req, vcriteria));
           //     console.log(res.headers['content-length']);
           cb(err, res);
         } );
}

var tasks = {
  //   createRoom,
  //   createAlert,
  vAlert
}

Tests.run(tasks);