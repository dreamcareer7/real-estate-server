const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const publicize = model => {
  delete model.chargebee_object
}

Orm.register('brand_customer', 'BrandCustomer', {
  publicize,
  getAll
})
