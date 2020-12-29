const { refineOtherContacts } = require('./helpers/refine')
const { processConfirmed, processDeleted } = require('./helpers/process')


const syncOtherContacts = async (google, credential) => {
  try {

    const { otherContacts, syncToken } = await google.listOtherContacts(credential.other_contacts_sync_token)
    const { confirmed, deleted } = refineOtherContacts(otherContacts)

    console.log('---- syncOtherContacts confirmed.length', confirmed.length, confirmed)
    console.log('---- syncOtherContacts deleted.length', deleted.length, deleted)

    const createdNum = await processConfirmed(credential, confirmed, true)
    const deletedNum = await processDeleted(credential, deleted)

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
  syncOtherContacts
}