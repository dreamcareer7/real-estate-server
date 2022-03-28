const Context = require('../../Context')

const { deleteByMicrosoftCredential } = require('../../UsersJob/microsoft')
const { stop } = require('../subscription/upsert')
const { deleteByCredential } = require('../message/delete')
const { get, revoke, findByUserBrand} = require('../credential')

const { get: getRole } = require('../../Brand/role/get')
const { getUserBrands } = require('../../Brand')


const disconnect = async (data) => {
  const credential = await get(data.id)

  if (credential.revoked) {
    return
  }

  Context.log('DisconnectMicrosoft - Job Started', credential.id, credential.email)

  await deleteByMicrosoftCredential(credential.id)
  await stop(credential.id)
  await deleteByCredential(credential.id)
  await revoke(credential.id)

  Context.log('DisconnectMicrosoft - Job Finished')
}

async function disconnectAllForUser(user, role) {
  const { brand } = await getRole(role)
  const userBrands = await getUserBrands(user)
  // To make sure if the user completely leaves the brand. 
  // Here we have a role leave event which may have another role and still remains in the brand.
  if (userBrands.indexOf(brand) === -1) {
    const credentialIds = await findByUserBrand(user, brand)
    for(const credentialId of credentialIds) {
      await disconnect({id: credentialId})
    }
  }
}

module.exports = {
  disconnect,
  disconnectAllForUser
}