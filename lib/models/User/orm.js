const ObjectUtil = require('../ObjectUtil')
const Orm        = require('../Orm/registry')
const { getAll } = require('./get')


const publicize = function(model) {
  model.has_password = Boolean(model.password)

  delete model.password
  delete model.secondary_password

  // Hide roles from other users. Only I can see my roles.
  const current = ObjectUtil.getCurrentUser()
  if (!current || model.id !== current) delete model.roles

  return model
}


Orm.register('user', 'User', {
  getAll,
  publicize,

  associations: {
    agents: {
      optional: true,
      collection: true,
      model: 'Agent'
    },
  
    contacts: {
      collection: true,
      optional: true,
      model: 'Contact',
      enabled: false
    },
  
    last_seen_by: {
      optional: true,
      model: 'Client',
      enabled: false
    },

    docusign: {
      model: 'DocusignAccount',
      enabled: false
    }
  }
})

module.exports = {
  publicize
}
