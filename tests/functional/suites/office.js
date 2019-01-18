const office = require('./mls/office.js')

const add = (cb) => {
  return frisby.create('add an office')
    .post('/jobs', {
      name: 'MLS.Office',
      data: {processed: office}
    })
    .after(cb)
    .expectStatus(200)
}

const getByMlsId = (cb) => {
  return frisby.create('get an office by mls id')
    .get(`/offices/search?mlsid=${office.mls_id}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: {
        mls_id: office.mls_id,
        name: office.name,
        matrix_unique_id: office.matrix_unique_id
      }
    })
}

const search = (cb) => {
  return frisby.create('search for an office')
    .get(`/offices/search?q=${office.name}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [{
        mls_id: office.mls_id,
        name: office.name
      }]
    })
}


module.exports = {
  add,
  getByMlsId,
  search,
}
