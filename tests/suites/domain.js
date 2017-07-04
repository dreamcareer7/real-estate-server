// const website = require('./data/website.js')
const types = require('./expected_objects/domain.js')

registerSuite('payment', ['add'])

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

const agreements = (cb) => {
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

const purchase = (cb) => {
  return frisby.create('purchase a domain')
    .post('/domains', {
      domain: results.domain.suggest.data[0].domain,
      stripe: results.payment.add.data.id,
      agreement: {
        ip: '127.0.0.1',
        keys: [
          results.domain.agreements.data[0].agreementKey
        ]
      }
    })
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  suggest,
  agreements,
  purchase
}
