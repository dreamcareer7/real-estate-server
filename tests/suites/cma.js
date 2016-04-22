var room = require('./data/room.js');
var room_response = require('./expected_objects/room.js');
var info_response = require('./expected_objects/info.js');
var uuid = require('node-uuid');
var cma = require('./data/cma.js');
var cma_response = require('./expected_objects/cma.js');
var listing_response = require('./expected_objects/listing.js');


var client = JSON.parse(JSON.stringify(cma));

registerSuite('room', ['create']);

var updated_room = 'updated_title';

var create = (cb) => {
  return frisby.create('create cma')
    .post('/rooms/' + results.room.create.data.id + '/cmas', client)
    .after(cb)
    .expectStatus(200)
    .expectJSONTypes({
      code: String,
      data: cma_response
    });
}

var create400 = (cb) => {
  return frisby.create('expect 400 with empty model')
    .post('/rooms/' + results.room.create.data.id + '/cmas')
    .after(cb)
    .expectStatus(400);
};

var getListingsForCMA = (cb) => {
  return frisby.create('get CMA listings')
    .get('/rooms/' + results.room.create.data.id + '/cmas/' + results.cma.create.data.id + '/listings')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: [listing_response]
    });
}

var getListingsForCMA404 = (cb) => {
  return frisby.create('expect 404 with invalid cma id')
    .get('/rooms/' + results.room.create.data.id + '/cmas/' + uuid.v1() + '/listings')
    .after(cb)
    .expectStatus(404);
}

var getCMAsForRoom = (cb) => {
  return frisby.create('get room CMAs')
    .get('/rooms/' + results.room.create.data.id + '/cmas/')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.cma.create.data]
    })
    .expectJSONTypes({
      code: String,
      data: [cma_response]
    });
}

var getCMAsForRoom404 = (cb) => {
  return frisby.create('expect 404 with invalid room id')
    .get('/rooms/' + uuid.v1() + '/cmas/')
    .after(cb)
    .expectStatus(404);
}

var bulkCMAShare = (cb) => {

  return frisby.create('bulk CMA share')
    .post('/cmas/', {
      cma: results.cma.create.data
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK'
    })
    .expectJSONTypes({
      code: String,
      data: []
    });
}

var bulkCMAShare400 = (cb) => {

  return frisby.create('expect 400 with empty model')
    .post('/cmas/')
    .after(cb)
    .expectStatus(400);
}

var deleteCMA = (cb) => {

  return frisby.create('delete CMA')
    .delete('/rooms/' + results.room.create.data.id + '/cmas/' + results.cma.create.data.id)
    .after(cb)
    .expectStatus(204);
}

var deleteCMA404 = (cb) => {

  return frisby.create('expect 404 when cma has been already deleted')
    .delete('/rooms/' + results.room.create.data.id + '/cmas/' + uuid.v1())
    .after(cb)
    .expectStatus(404);
}

var deleteCMAWorked = (cb) => {
  return frisby.create('expect empty array when cma is deleted')
    .get('/rooms/' + results.room.create.data.id + '/cmas/')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
    .expectJSONTypes({
      code: String,
      data: []
    });
}

module.exports = {
  create,
  create400,
  getListingsForCMA,
  getListingsForCMA404,
  getCMAsForRoom,
  getCMAsForRoom404,
  bulkCMAShare,
  bulkCMAShare400,
  deleteCMA,
  deleteCMA404,
  deleteCMAWorked
};