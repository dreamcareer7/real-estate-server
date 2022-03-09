const BrandRole = require('../../Brand/role/emitter')
const { Credential } = require('../workers/publisher')

module.exports = function attachGoogleEventHandlers() {
  BrandRole.on('member:leave', Credential.onMemberLeave)  
}
