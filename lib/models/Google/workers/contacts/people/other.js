const { refineOtherContacts } = require('./helpers/refine')
const { processContacts }     = require('./helpers/process')


const syncOtherContacts = async (google, credential) => {
  try {

    const { otherContacts, syncToken } = await google.listOtherContacts(credential.other_contacts_sync_token)
    const { confirmed, deleted } = refineOtherContacts(otherContacts)
    const createdNum = await processContacts(credential, confirmed, true)

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