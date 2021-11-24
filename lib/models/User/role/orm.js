const Orm = require('../../Orm/registry')

const associations = {
  brand: {
    model: 'Brand'
  },

  subscription: {
    model: 'BrandSubscription'
  },

  settings: {
    model: 'UserSetting',
    enabled: true,
  }
}


Orm.register('user_role', 'UserRole', {
  associations
})
