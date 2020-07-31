const Context = require('../../Context')

const MicrosoftSubscription = require('../subscription')
const MicrosoftMessage      = require('../message')
const MicrosoftCredential   = require('../credential')


const disconnect = async (data) => {
  const credential = await MicrosoftCredential.get(data.cid)

  if (credential.revoked) {
    return
  }

  Context.log('DisconnectMicrosoft - Job Started', credential.id, credential.email)


  await MicrosoftSubscription.stop(credential.id)
  await MicrosoftCredential.disconnect(credential.id)
  await MicrosoftMessage.deleteByCredential(credential.id)
  await MicrosoftCredential.revoke(credential.id)


  Context.log('DisconnectMicrosoft - Job Finished')

  return
}


module.exports = {
  disconnect
}