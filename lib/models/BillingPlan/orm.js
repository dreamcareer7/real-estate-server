const Orm = require('../Orm/registry')

const { getAll } = require('./get')


Orm.register('billing_plan', 'BillingPlan', {
  getAll
})