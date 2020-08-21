const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  user: {
    model: 'User'
  }
}

Orm.register('brand_user', 'BrandUser', {
  getAll,
  associations
})
