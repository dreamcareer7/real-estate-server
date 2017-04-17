const schools = require('./data/schools.js')
const schools_response = require('./expected_objects/schools.js')

const invalid_q_search = (cb) => {
  return frisby.create('expect 400 with invalid (small) q')
    .get('/schools/search?q=a')
    .after(cb)
    .expectStatus(400)
}

const valid_q_search = (cb) => {
  return frisby.create('expect 200 with valid q')
    .get('/schools/search?q=aaa')
    .after(cb)
    .expectStatus(200)
}

const invalid_districts_search = (cb) => {
  return frisby.create('expect 400 with invalid districts, districts should be an array')
    .get('/schools/search?districts=a')
    .after(cb)
    .expectStatus(400)
}

const valid_districts_search = (cb) => {
  return frisby.create('expect 200 with valid districts')
    .get('/schools/search?districts[]=a')
    .after(cb)
    .expectStatus(200)
}

const search_by_districts = (cb) => {
  return frisby.create('search for schools by districts')
    .get('/schools/search?districts[]=Alabama')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: schools
    })
    .expectJSONTypes({
      code: String,
      data: [schools_response.schools]
    })
}

const search_districts = (cb) => {
  return frisby.create('search for districts')
    .get('/schools/districts/search')
    .after(cb)
    .expectStatus(200)
    .expectJSONTypes({
      code: String,
      data: [schools_response.districts]
    })
}

module.exports = {
  invalid_q_search,
  valid_q_search,
  invalid_districts_search,
  valid_districts_search,
  search_by_districts,
  search_districts
}
