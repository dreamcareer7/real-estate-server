const Orm = require('../Orm/registry')

const { getAll } = require('./get')


Orm.register('users_jobs', 'UsersJob', {
  getAll
})