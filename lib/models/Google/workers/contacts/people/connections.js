const { refineConnections } = require('./helpers/refine')
const { processConfirmed, processDeleted } = require('./helpers/process')

const GoogleCredential = {
  ...require('../../../credential/update')
}


const syncContacts = async (google, credential) => {
  try {

    const { connections, syncToken } = await google.listConnections(credential.contacts_sync_token)
    const { confirmed, deleted } = refineConnections(connections)

    console.log('---- syncContacts confirmed.length', confirmed.length, confirmed)
    console.log('---- syncContacts deleted.length', deleted.length, deleted)

    const createdNum = await processConfirmed(credential, confirmed, false)
    const deletedNum = await processDeleted(credential, deleted)

    if (syncToken) {
      await GoogleCredential.updateContactsSyncToken(credential.id, syncToken)
    }

    return {
      status: true,
      createdNum,
      deletedNum
    }

  } catch (ex) {

    return  {
      status: false,
      ex
    }
  }
}


module.exports = {
  syncContacts
}