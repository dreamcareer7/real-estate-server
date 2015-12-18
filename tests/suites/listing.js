var listing = require('./data/listing.js');

var listing_response = require('./expected_objects/listing.js');
var info_response = require('./expected_objects/info.js');

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

module.exports = {
  by_mui,
  by_mls,
  getListing
}