const Orm = require('../Orm/registry')

const { getAll } = require('./get')


Orm.register('form', 'Form', {
  getAll
})