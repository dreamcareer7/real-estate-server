const { refineOtherContacts } = require('./helpers/refine')
const { processContacts }     = require('./helpers/process')


const syncOtherContacts = async (google, credential) => {
  try {

    const { otherContacts, syncToken } = await google.listOtherContacts(credential.other_contacts_sync_token)
    const contacts   = refineOtherContacts(otherContacts)
    const createdNum = await processContacts(credential, contacts, true)

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
  syncOtherContacts
}