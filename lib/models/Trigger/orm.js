const Orm = require('../Orm/registry')
const { getAll } = require('./get')

Orm.register('trigger', 'Trigger', {
  getAll,
  associations: {
    campaign: {
      model: 'EmailCampaign',
      enabled: false,
    },

    event: {
      model: 'CrmTask',
      enabled: false,
    },

    flow: {
      model: 'Flow',
      enabled: false
    },

    created_by: {
      model: 'User',
      enabled: false,
    },
  }
})
