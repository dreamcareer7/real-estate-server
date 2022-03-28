const BrandRole = require('../../Brand/role/emitter')
const { Disconnect } = require('../workers/publisher')

function disconnectAllForUser(data) {
  Disconnect.disconnectAllForUser(data.user, data.role)
}

module.exports = function attachMicrosoftEventHandlers() {
  BrandRole.on('member:leave', disconnectAllForUser)  
}
