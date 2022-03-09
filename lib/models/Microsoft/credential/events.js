const BrandRole = require('../../Brand/role/emitter')
const { Credential } = require('../workers/publisher')

module.exports = function attachMicrosoftEventHandlers() {
  BrandRole.on('member:leave', Credential.onMemberLeave)  
}
