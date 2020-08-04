const Orm = require('../../Orm/registry')
const { getAll } = require('./get')

Orm.register('template_instance', 'TemplateInstance', {
  getAll,
  associations: {
    file: {
      model: 'AttachedFile'
    },
  
    template: {
      model: 'Template',
      enabled: false
    },
  
    listings: {
      model: 'Listing',
      collection: true,
      enabled: false
    },
  
    contacts: {
      model: 'Contact',
      collection: true,
      enabled: false
    },
  
    deals: {
      model: 'Deal',
      collection: true,
      enabled: false
    }
  }
  
})
