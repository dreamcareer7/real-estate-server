const Orm = require('../Orm/registry')
const { getAll } = require('./get')

Orm.register('message', 'Message', {
  getAll,
  publicize(model) {
    if (model.total) delete model.total
  
    return model
  },

  associations: {
    author: {
      optional: true,
      model: 'User'
    },
  
    recommendation: {
      optional: true,
      model: 'Recommendation'
    },
  
    notification: {
      optional: true,
      model: 'Notification'
    },
  
    attachments: {
      collection: true,
      model: 'AttachedFile',
      default_value: () => []
    }
  }
})
