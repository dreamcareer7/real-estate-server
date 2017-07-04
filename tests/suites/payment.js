const types = require('./expected_objects/payment.js')

const add = (cb) => {
  return frisby.create('add a stripe customer')
    .post('/payments/stripe/customers', {
      token: 'tok_visa' // Taken from https://stripe.com/docs/testing
    })
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
    })
    .expectJSONTypes({
      code: String,
      data: types.customer
    })
}

const get = (cb) => {
  return frisby.create('get all customers associated with a user')
    .get('/payments/stripe/customers')
    .after(cb)
    .expectStatus(200)
    .expectJSON({
      code: 'OK',
      data: [results.payment.add.data]
    })
    .expectJSONTypes({
      code: String,
      data: [types.customer]
    })
}

const remove = (cb) => {
  return frisby.create('delete a customer')
    .delete(`/payments/stripe/customers/${results.payment.add.data.id}`)
    .after(cb)
    .expectStatus(204)
}

module.exports = {
  add,
  get,
  remove
}
