const Orm = require('../../Orm/registry')
const { getAll } = require('./get')

Orm.register('contact_role', 'ContactRole', {
  getAll,
  associations: {
    brand: {
      model: 'Brand',
      enabled: false,
    },
    user: {
      model: 'User',
      enabled: false,
    },
    contact: {
      model: 'Contact',
      enabled: false,
    },
    created_by: {
      model: 'User',
      enabled: false,
    }
  }
})
