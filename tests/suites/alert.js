var criteria = require('./data/alert_criteria.js');


registerSuite('room', ['create']);

var create = (cb) => {
  return frisby.create('create alert')
        .post('/rooms/' + results.room.create.data.id + '/alerts', criteria)
        .after(cb)
        .expectStatus(200)
        .expectJSON({
          code: 'OK',
          data: criteria
        });
}

var virtual = (cb) => {
  var criteria = require('./data/valert_criteria.js')
  return frisby.create('virtual alert')
         .post('/valerts', criteria)
         .expectStatus(200)
         .after(cb);
}


module.exports = {
  create,
  virtual
}