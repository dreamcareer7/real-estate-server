const { refineConnections } = require('./helpers/refine')
const { processContacts }   = require('./helpers/process')


const syncContacts = async (google, credential) => {
  try {

    const { connections, syncToken } = await google.listConnections(credential.contacts_sync_token)
    const { confirmed, deleted } = refineConnections(connections)
    const createdNum = await processContacts(credential, confirmed, false)

    //  if ( confirmed.length === 0 ) ??

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