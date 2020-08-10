const Orm = require('../../Orm/registry')

const { getAll, getCurrentBrand } = require('./get')

const associations = {
  steps: {
    model: 'BrandFlowStep',
    enabled: false,
    collection: true,
    optional: false
  }
}

const publicize = (data) => {
  const brand_id = getCurrentBrand()

  data.is_editable = (typeof brand_id === 'string' && data.brand === brand_id)
}


Orm.register('brand_flow', 'BrandFlow', {
  getAll,
  publicize,
  associations
})