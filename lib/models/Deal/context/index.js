const Orm = require('../../Orm/registry')

const DealContext = {
  ...require('./get'),
  ...require('./save')
}

Orm.register('deal_context_item', 'DealContext', DealContext)

DealContext.associations = {
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


module.exports = DealContext
