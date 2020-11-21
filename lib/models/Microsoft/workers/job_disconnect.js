const Context = require('../../Context')

const { deleteByMicrosoftCredential } = require('../../UsersJob/microsoft')
const { stop } = require('../subscription/upsert')
const { deleteByCredential } = require('../message/delete')
const { get, revoke } = require('../credential')



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

  return
}


module.exports = {
  disconnect
}