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
    summary: {
      model: 'ContactSummary',
      enabled: false,
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
    triggers: {
      model: 'Trigger',
      enabled: false,
      collection: true,
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
    },
    assignees: {
      model: 'ContactRole',
      enabled: false,
      collection: true,
    },
  }
})
