const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

Orm.register('showing_role', 'ShowingRole', {
  getAll,
  associations: {
    user: {
      id: (r, cb) => cb(null, r.user_id),
      model: 'User',
      collection: false,
      enabled: false,
    },
  },
})
