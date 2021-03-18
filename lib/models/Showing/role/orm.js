const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

Orm.register('showing_role', 'ShowingRole', {
  getAll,
  associations: {
    brand: {
      model: 'Brand',
      enabled: false
    },
    user: {
      model: 'User',
      enabled: false
    }
  }
})
