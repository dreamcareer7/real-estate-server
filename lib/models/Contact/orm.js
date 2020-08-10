const Orm        = require('../Orm/registry')
const { getAll } = require('./get')

Orm.register('contact', 'Contact', {
  getAll,

  associations: {
    attributes: {
      model: 'ContactAttribute',
      enabled: false,
      collection: true
    },
    users: {
      collection: true,
      optional: true,
      model: 'User',
      enabled: false
    },
    deals: {
      collection: true,
      optional: true,
      model: 'Deal',
      enabled: false
    },
    lists: {
      model: 'ContactList',
      enabled: false,
      collection: true
    },
    flows: {
      model: 'Flow',
      enabled: false,
      collection: true
    },
    brand: {
      model: 'Brand',
      enabled: false
    },
    user: {
      model: 'User',
      enabled: false
    },
    created_by: {
      model: 'User',
      enabled: false
    },
    updated_by: {
      model: 'User',
      enabled: false
    }
  }
})