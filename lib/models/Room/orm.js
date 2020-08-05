const Orm = require('../Orm/registry')

const { getAll } = require('./get')

const associations = {
  owner: {
    optional: true,
    model: 'User'
  },

  users: {
    collection: true,
    model: 'User'
  },

  latest_message: {
    optional: true,
    model: 'Message'
  },

  latest_activity: {
    optional: true,
    model: 'Message'
  },

  attachments: {
    collection: true,
    enabled: false,
    model: 'AttachedFile'
  },

  recommendations: {
    collection: true,
    enabled: false,
    model: 'Recommendation'
  }
}

const publicize = function(model) {
  if(model.users_info)
    delete model.users_info

  return model
}

Orm.register('room', 'Room', {
  getAll,
  publicize,
  associations
})
