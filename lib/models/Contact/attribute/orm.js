const Orm        = require('../../Orm/registry')
const { getAll } = require('./get')

Orm.register('contact_attribute', 'ContactAttribute', {
  getAll,
  associations: {
    attribute_def: {
      model: 'ContactAttributeDef',
      enabled: false
    }  
  }
})
