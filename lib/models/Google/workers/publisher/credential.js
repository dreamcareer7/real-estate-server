const { peanar } = require('../../../../utils/peanar')
const { get } = require('../../../Brand/role/get')
const { findByUserBrand, revoke } = require('../../credential')

async function onMemberLeave({role, user}) {
  const { brand } = await get(role)
  const credentials = await findByUserBrand(user, brand)
  for(const credential of credentials) {
    await revoke(credential)
  }
}

module.exports = {
  onMemberLeave: peanar.job({
    handler: onMemberLeave,
    name: 'revokeCredentialOnLeave',
    queue: 'google_revoke_on_leave',
    exchange: 'google'
  })
}