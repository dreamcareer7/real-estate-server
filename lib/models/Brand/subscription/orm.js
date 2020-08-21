const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  plan: {
    model: 'BillingPlan'
  }
}

Orm.register('brand_subscription', 'BrandSubscription', {
  getAll,
  associations
})
