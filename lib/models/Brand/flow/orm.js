const Orm = require('../../Orm/registry')
const Context = require('../../Context')

const { getAll } = require('./get')

const associations = {
  steps: {
    model: 'BrandFlowStep',
    enabled: false,
    collection: true,
    optional: false
  }
}

const publicize = (data) => {
  const brand = Context.get('brand')

  data.is_editable = (data.brand === brand?.id)
}


Orm.register('brand_flow', 'BrandFlow', {
  getAll,
  publicize,
  associations
})
