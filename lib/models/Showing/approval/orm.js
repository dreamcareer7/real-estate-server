const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

Orm.register('showing_approval', 'ShowingApproval', {
  getAll,
  associations: {
    // role: {
    //   model: 'ShowingRole',
    //   enabled: false
    // }
  }
})
