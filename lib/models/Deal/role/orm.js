const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  user: {
    model: 'User',
    optional: true
  },

  agent: {
    model: 'Agent',
    optional: true
  },

  brand: {
    model: 'Brand',
    optional: true,
    enabled: false
  }
}

Orm.register('deal_role', 'DealRole', {
  getAll,
  associations
})
