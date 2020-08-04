const CrmTask = require('./task')
const Orm = require('../../Orm/registry')

const Model = new CrmTask

Orm.register('crm_task', 'CrmTask', Model)

module.exports = Model
