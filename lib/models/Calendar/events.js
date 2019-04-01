const { enqueueJob } = require('../../utils/worker')

const BrandRole = require('../Brand/role')

function onBrandRoleMemberAdded({ role, user }) {
  enqueueJob('calendar', 'set_default_notification_settings', { role, user })
}

module.exports = function attachEventHandlers() {
  BrandRole.on('member:join', onBrandRoleMemberAdded)
}
