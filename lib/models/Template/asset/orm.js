const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  file: {
    model: 'AttachedFile'
  }
}

Orm.register('template_asset', 'TemplateAsset', {
  getAll,
  associations
})
