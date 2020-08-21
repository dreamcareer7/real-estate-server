const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  users: {
    collection: true,
    enabled: false,
    model: 'BrandUser'
  }
}

Orm.register('brand_role', 'BrandRole', {
  getAll,
  associations
})
