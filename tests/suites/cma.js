const uuid = require('node-uuid')
const cma = require('./data/cma.js')
const cma_response = require('./expected_objects/cma.js')
const listing_response = require('./expected_objects/listing.js')

const client = JSON.parse(JSON.stringify(cma))

registerSuite('room', ['create'])

const create = (cb) => {
  return frisby.create('create cma')
    .post('/rooms/' + results.room.create.data.id + '/cmas', client)
    .after(cb)
    .expectStatus(200)
    .expectJSONTypes({
      code: String,
      data: cma_response
    })
}

const create400 = (cb) => {
  return frisby.create('expect 400 with empty model')
    .post('/rooms/' + results.room.create.data.id + '/cmas')
    .after(cb)
    .expectStatus(400)
}

const getListingsForCMA = (cb) => {
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
    })
}

const getListingsForCMA404 = (cb) => {
  return frisby.create('expect 404 with invalid cma id')
    .get('/rooms/' + results.room.create.data.id + '/cmas/' + uuid.v1() + '/listings')
    .after(cb)
    .expectStatus(404)
}

const getCMAsForRoom = (cb) => {
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
    })
}

const getCMAsForRoom404 = (cb) => {
  return frisby.create('expect 404 with invalid room id')
    .get('/rooms/' + uuid.v1() + '/cmas/')
    .after(cb)
    .expectStatus(404)
}

const deleteCMA = (cb) => {
  return frisby.create('delete CMA')
    .delete('/rooms/' + results.room.create.data.id + '/cmas/' + results.cma.create.data.id)
    .after(cb)
    .expectStatus(204)
}

const deleteCMA404 = (cb) => {
  return frisby.create('expect 404 when cma has been already deleted')
    .delete('/rooms/' + results.room.create.data.id + '/cmas/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

const deleteCMAWorked = (cb) => {
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
    })
}

module.exports = {
  create,
  create400,
  getListingsForCMA,
  getListingsForCMA404,
  getCMAsForRoom,
  getCMAsForRoom404,
  deleteCMA,
  deleteCMA404,
  deleteCMAWorked
}
