const Orm = require('../../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  checklists: {
    model: 'BrandChecklist',
    collection: true
  }
}

Orm.register('brand_property_type', 'BrandPropertyType', {
  getAll,
  associations
})
