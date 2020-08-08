const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  template: {
    model: 'Template',
    enabled: true
  },

  thumbnail: {
    model: 'AttachedFile',
    optional: true,
    enabled: true
  },

  preview: {
    model: 'AttachedFile',
    optional: true,
    enabled: true
  }
}


Orm.register('brand_template', 'BrandTemplate', {
  getAll,
  associations
})
