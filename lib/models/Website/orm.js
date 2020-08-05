const Orm = require('../Orm/registry')

const { getAll } = require('./get')


const associations = {
  user: {
    model: 'User'
  },

  brand: {
    optional: true,
    model: 'Brand'
  }
}

Orm.register('website', 'Website', {
  getAll,
  associations
})