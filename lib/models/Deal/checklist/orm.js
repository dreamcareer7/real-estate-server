const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  tasks: {
    collection: true,
    model: 'Task'
  }
}

Orm.register('deal_checklist', 'DealChecklist', {
  getAll,
  associations
})
