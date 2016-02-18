var listing = require('./data/listing.js');
var listing_response = require('./expected_objects/listing.js');
var info_response = require('./expected_objects/info.js');
var uuid = require('node-uuid');

var by_mui = (cb) => {
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
    });
}

var by_mui404 = (cb) => {
  return frisby.create('expect 404 with invalid mui')
    .get('/listings/search?mui=1')
    .after(cb)
    .expectStatus(404)
}

var by_mls = (cb) => {
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
    });
}

var by_mls404 = (cb) => {
  return frisby.create('expect 404 with invalid mls')
    .get('/listings/search?mls_number=1')
    .after(cb)
    .expectStatus(404);
}

var getListing = (cb) => {
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
    });
}

var by_query = (cb) => {
  return frisby.create('search for a listing by string search')
    .get('/listings/search?q=Dallas&status=Active,Leased')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      info: {
        count:10
      }
    })
}

var getListing404 = (cb) => {
  return frisby.create('expect 404 with invalid listing id')
    .get('/listings/' + uuid.v1())
    .after(cb)
    .expectStatus(404);
}

var similars = (cb) => {
  return frisby.create('get similar listings from recommendation engine')
    .get('/listings/'+listing.mls_number+'/similars')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      info:{
        count:5
      },
      data:[]
    })
    .expectJSONLength('data', 5);
}

module.exports = {
  by_mui,
  by_mui404,
  by_mls,
  by_mls404,
  getListing,
  getListing404,
  by_query,
  similars
}