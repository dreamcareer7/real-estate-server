var listing = require('./data/listing.js');

var by_mui = (cb) => {
  return frisby.create('search for a listing by mui')
        .get('/listings/search?mui='+listing.matrix_unique_id)
        .expectStatus(200)
        .expectJSON({
          code:'OK',
          data:listing
        })
        .after(cb)
}

var by_mls = (cb) => {
  return frisby.create('search for a listing by mls')
        .get('/listings/search?mls_number='+listing.mls_number)
        .expectStatus(200)
        .expectJSON({
          code:'OK',
          data:listing
        })
        .after(cb);
}

var get = (cb) => {
  return frisby.create('search for a listing by id')
        .get('/listings/'+listing.id)
        .expectStatus(200)
        .expectJSON({
          code:'OK',
          data:listing
        })
        .after(cb);
}

module.exports = {
  by_mui,
  by_mls,
  get:get
}