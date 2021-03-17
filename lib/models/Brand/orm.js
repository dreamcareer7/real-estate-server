const Orm = require('../Orm/registry')

const { getAll } = require('./get')

const associations = {
  roles: {
    collection: true,
    model: 'BrandRole',
    enabled: false
  },

  parent: {
    optional: true,
    model: 'Brand'
  },

  children: {
    collection: true,
    model: 'Brand',
    enabled: false
  }
}

const publicize = model => {
  if (model.settings)
    model.settings.type = 'brand_settings'

  if (model.palette)
    model.palette.type = 'brand_palette'

  if (model.assets)
    model.assets.type = 'brand_assets'

  if (model.messages)
    model.messages.type = 'brand_messages'

  if (model.tags)
    model.tags.forEach(tag => {
      tag.type = 'brand_tag'
    })
}

Orm.register('brand', 'Brand', {
  getAll,
  publicize,
  associations
})
