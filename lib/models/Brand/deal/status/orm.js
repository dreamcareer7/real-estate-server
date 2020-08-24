const Orm = require('../../../Orm/registry')

const { getAll } = require('./get')

Orm.register('brand_deal_status', 'BrandDealStatus', {
  getAll
})
