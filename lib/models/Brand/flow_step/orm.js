const Orm = require('../../Orm/registry')

const { getAll, getCurrentBrand } = require('./get')

const associations = {
  event: {
    model: 'BrandEvent',
    enabled: false,
    collection: false,
    optional: true
  },

  email: {
    model: 'BrandEmail',
    enabled: false,
    collection: false,
    optional: true
  }
}

const publicize = (data) => {
  const brand_id = getCurrentBrand()

  data.is_editable = (typeof brand_id === 'string' && data.brand === brand_id)
}


Orm.register('brand_flow_step', 'BrandFlowStep', {
  getAll,
  publicize,
  associations
})