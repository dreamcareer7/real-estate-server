const BrandRole = require('../../Brand/role/emitter')
const { get } = require('../../Brand/role/get')
const { findByUserBrand, revoke } = require('./index')

async function onMemberLeave({role, user}) {
  const { brand } = await get(role)
  const credentials = await findByUserBrand(user, brand)
  for(const credential of credentials) {
    await revoke(credential)
  }
}

module.exports = function attachMicrosoftEventHandlers() {
  
  BrandRole.on('member:leave', onMemberLeave)
  
}
