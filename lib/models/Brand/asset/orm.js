const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  file: {
    model: 'AttachedFile'
  }
}

Orm.register('brand_asset', 'BrandAsset', {
  getAll,
  associations
})
