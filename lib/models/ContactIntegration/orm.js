const Orm = require('../Orm/registry')

const { getAll } = require('./get')


Orm.register('contact_integration', 'ContactIntegration', {
  getAll
})