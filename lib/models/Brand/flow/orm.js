const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  steps: {
    model: 'BrandFlowStep',
    enabled: false,
    collection: true,
    optional: false
  }
}


Orm.register('brand_flow', 'BrandFlow', {
  getAll,
  associations
})