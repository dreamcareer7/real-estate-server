const Orm = require('../../Orm/registry')

const associations = {
  brand: {
    model: 'Brand'
  },

  subscription: {
    model: 'BrandSubscription'
  }
}


Orm.register('user_role', 'UserRole', {
  associations
})