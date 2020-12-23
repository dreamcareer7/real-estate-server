const { refineConnections } = require('./helpers/refine')
const { processConfirmed, processDeleted } = require('./helpers/process')


const syncContacts = async (google, credential) => {
  try {

    const { connections, syncToken } = await google.listConnections(credential.contacts_sync_token)
    const { confirmed, deleted } = refineConnections(connections)

    const createdNum = await processConfirmed(credential, confirmed, false)
    const deletedNum = await processDeleted(credential, deleted, false)

    return {
      status: true,
      syncToken,
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