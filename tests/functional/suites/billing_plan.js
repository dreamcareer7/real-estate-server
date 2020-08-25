const mock_plan = require('../../../lib/models/Brand/chargebee/mock/plan')

const create = (cb) => {
  const content = {
    plan: mock_plan
  }

  return frisby.create('Create a billing plan')
    .post('/chargebee/webhook', {content})
    .after(cb)
    .expectStatus(200)
}

const getAll = (cb) => {
  return frisby.create('Get all plans')
    .get('/billing_plans')
    .after(cb)
    .expectStatus(200)
}

module.exports = {
  create,
  getAll
}
