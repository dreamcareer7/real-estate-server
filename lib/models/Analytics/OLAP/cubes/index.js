const CubeBase = require('../cube')

const deals = require('./deal')
const crm_tasks = require('./crm_task')

module.exports = {
  Deals: new CubeBase(deals),
  CrmTask: new CubeBase(crm_tasks)
}
