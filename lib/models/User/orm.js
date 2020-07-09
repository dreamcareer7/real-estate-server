const ObjectUtil = require('../ObjectUtil')

const publicize = function(model) {
  model.has_password = Boolean(model.password)

  delete model.password
  delete model.secondary_password

  // Hide roles from other users. Only I can see my roles.
  const current = ObjectUtil.getCurrentUser()
  if (!current || model.id !== current) delete model.roles

  return model
}

module.exports = {
  publicize
}
