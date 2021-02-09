const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  crm_task: {
    model: 'CrmTask',
    collection: false,
    enabled: false,
    optional: true
  },
  email: {
    model: 'EmailCampaign',
    collection: false,
    enabled: false,
    optional: true
  },
  origin: {
    model: 'BrandFlowStep',
    enabled: false,
    collection: false,
    optional: true
  }
}


Orm.register('flow_step', 'FlowStep', {
  getAll,
  associations
})
