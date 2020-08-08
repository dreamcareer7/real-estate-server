const Orm = require('../../Orm/registry')
const { getAll } = require('./get')

Orm.register('contact_attribute_def', 'ContactAttributeDef', {
  getAll
})
