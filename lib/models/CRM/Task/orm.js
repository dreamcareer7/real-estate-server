const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = require('./associations')


Orm.register('crm_task', 'CrmTask', {
  getAll,
  associations
})