const Orm = require('../Orm')


const Room = {
  ...require('./get'),
  ...require('./create'),
  ...require('./consts'),
  ...require('./users/get'),
  ...require('./users/add'),
  ...require('./users/remove'),
  ...require('./recommendation'),
  ...require('./compose'),
  ...require('./update'),
  ...require('./search'),
  ...require('./branch'),
  ...require('./notification')
}

Orm.register('room', 'Room', Room)

Room.associations = {
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

Room.publicize = function(model) {
  if(model.users_info)
    delete model.users_info

  return model
}

module.exports = Room
