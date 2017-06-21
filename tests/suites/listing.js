const listing = require('./data/listing.js')
const listing_response = require('./expected_objects/listing.js')
const subdivision_response = require('./expected_objects/subdivision.js')
const uuid = require('node-uuid')

const by_mui = (cb) => {
  return frisby.create('search for a listing by mui')
    .get('/listings/search?mui=' + listing.matrix_unique_id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: listing
    })
    .expectJSONTypes({
      code: String,
      data: listing_response
    })
}

const by_mui404 = (cb) => {
  return frisby.create('expect 401 with invalid mui')
    .get('/listings/search?mui=1')
    .after(cb)
    .expectStatus(400)
}

const by_mls = (cb) => {
  return frisby.create('search for a listing by mls')
    .get('/listings/search?mls_number=' + listing.mls_number)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: listing
    })
    .expectJSONTypes({
      code: String,
      data: listing_response
    })
}

const by_mls404 = (cb) => {
  return frisby.create('expect 401 with invalid mls')
    .get('/listings/search?mls_number=1')
    .after(cb)
    .expectStatus(400)
}

const getListing = (cb) => {
  return frisby.create('search for a listing by id')
    .get('/listings/' + listing.id)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: listing
    })
    .expectJSONTypes({
      code: String,
      data: listing_response
    })
}

const by_query = (cb) => {
  return frisby.create('search for a listing by string search')
    .get('/listings/search?q=Dallas')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      info: {
        count: 75
      }
    })
}

const getListing404 = (cb) => {
  return frisby.create('expect 404 with invalid listing id')
    .get('/listings/' + uuid.v1())
    .after(cb)
    .expectStatus(404)
}

const searchSubdivisions = cb => {
  return frisby.create('search for a subdivision')
    .get('/subdivisions/search?q=Arbor')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      info: {
        count: 1
      }
    })
    .expectJSON({
      data: [subdivision_response]
    })
}

module.exports = {
  by_mui,
  by_mui404,
  by_mls,
  by_mls404,
  getListing,
  getListing404,
  by_query,
  searchSubdivisions
}
