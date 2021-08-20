const Orm = require('../../Orm/registry')
const { getAll } = require('./get')

Orm.register('brand_trigger', 'BrandTrigger', {
  getAll,
  associations: {
    user: {
      model: 'User',
      enabled: false,
    },
    
    created_by: {
      model: 'User',
      enabled: false,
    },
    
    brand: {
      model: 'Brand',
      enabled: false,
    },
    
    template: {
      model: 'Template',
      enabled: false,
    },
  },
})
