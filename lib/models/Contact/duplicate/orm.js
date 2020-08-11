const Orm = require('../../Orm/registry')
const { getAll } = require('./get')

Orm.register('contact_duplicate', 'ContactDuplicate', {
  associations: {
    contacts: {
      model: 'Contact',
      collection: true
    }
  },
  getAll  
})
