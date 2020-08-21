const { set_default_notification_settings } = require('./worker')

const BrandRole = require('../Brand/role/emitter')

function onBrandRoleMemberAdded({ role, user }) {
  set_default_notification_settings({ role, user })
}

module.exports = function attachEventHandlers() {
  BrandRole.on('member:join', onBrandRoleMemberAdded)
}
