const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  brand: {
    model: 'Brand'
  },

  subscription: {
    model: 'BrandSubscription'
  }
}


Orm.register('user_role', 'UserRole', {
  getAll,
  associations
})