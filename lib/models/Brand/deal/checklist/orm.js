const Orm = require('../../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  required_contexts: {
    enabled: false,
    collection: true,
    model: 'BrandContext'
  },

  optional_contexts: {
    enabled: false,
    collection: true,
    model: 'BrandContext'
  },

  statuses: {
    enabled: false,
    collection: true,
    model: 'BrandDealStatus'
  },
}

Orm.register('brand_checklist', 'BrandChecklist', {
  getAll,
  associations
})
