const { refineConnections } = require('./helpers/refine')
const { processContacts }   = require('./helpers/process')


const syncContacts = async (google, credential) => {
  try {

    const { connections, syncToken } = await google.listConnections(credential.contacts_sync_token)
    const contacts   = refineConnections(connections)
    const createdNum = await processContacts(credential, contacts, false)

    return {
      status: true,
      syncToken,
      createdNum
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