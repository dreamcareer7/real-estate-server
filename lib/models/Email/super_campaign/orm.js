const Orm = require('../../Orm/registry')
const { getAll } = require('./get')

Orm.register('super_campaign', 'SuperCampaign', {
  getAll,
  associations: {
    template_instance: {
      model: 'TemplateInstance',
      enabled: false
    },
  }
})
