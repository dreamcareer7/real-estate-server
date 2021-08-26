const Orm = require('../../Orm/registry')
const { getAll } = require('./get')

Orm.register('brand_trigger', 'BrandTrigger', {
  getAll,
  associations: {
    template: {
      model: 'BrandTemplate',
      enabled: false,
    },

    template_instance: {
      model: 'TemplateInstance',
      enabled: false,
    },
  },
})
