const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

Orm.register('showing_role', 'ShowingRole', {
  getAll,
  associations: {
    user: {
      model: 'User',
      collection: false,
      enabled: false,
    },
  },
})
