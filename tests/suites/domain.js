// const website = require('./data/website.js')
const types = require('./expected_objects/domain.js')

// registerSuite('user', ['create'])

const suggest = (cb) => {
  return frisby.create('suggest domains for a query')
    .get('/domains/suggest?q=myname')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: []
    })
    .expectJSONTypes({
      code: String,
      data: [types.domain]
    })
}

const getAgreements = (cb) => {
  return frisby.create('get license agreements for a domain name')
    .get(`/domains/agreements?domain=${results.domain.suggest.data[0].domain}`)
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [],
      info: {
        count: 1
      }
    })
    .expectJSONTypes({
      code: String,
      data: [types.agreement]
    })
}

module.exports = {
  suggest,
  getAgreements
}
