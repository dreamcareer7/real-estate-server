const Orm = require('../../Orm/registry')

const { getAll } = require('./get')

const associations = {
  created_by: {
    enabled: false,
    optional: true,
    model: 'User'
  },

  approved_by: {
    enabled: false,
    optional: true,
    model: 'User'
  },

  submission: {
    enabled: false,
    optional: true,
    model: 'Submission'
  },

  definition: {
    enabled: false,
    optional: true,
    model: 'BrandContext'
  }
}


Orm.register('deal_context_item', 'DealContext', {
  getAll,
  associations
})
