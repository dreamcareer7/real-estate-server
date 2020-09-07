const Orm = require('../../../Orm/registry')

const { getAll } = require('./get')

Orm.register('form_template', 'FormTemplate', {
  getAll
})
