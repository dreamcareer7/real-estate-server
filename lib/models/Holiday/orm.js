const Orm = require('../Orm/registry')

const { getAll } = require('./get')

Orm.register('holiday', 'Holiday', {
  getAll
})
