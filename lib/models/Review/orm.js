const Orm = require('../Orm/registry')

const { getAll } = require('./get')


const associations = {
  updated_by: {
    enabled: false,
    model: 'User'
  }
}

Orm.register('review', 'Review', {
  getAll,
  associations
})