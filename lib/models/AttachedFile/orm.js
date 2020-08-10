const Orm = require('../Orm/registry')
const { getAll } = require('./get')

Orm.register('file', 'AttachedFile', {
  getAll
})
