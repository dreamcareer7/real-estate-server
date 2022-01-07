const Context  = require('../../Context')
const { get } = require('../credential/get')
const { getMGraphClient } = require('../plugin/client')
const { 
  updateContactIds,
} = require('./model')

async function prepare(cid) {
  const credential = await get(cid)
  Context.log('PreparingMicrosoftClient', credential.id)

  if ( credential.revoked || credential.deleted_at ) {
    throw new Error('Microsoft credential revoked or deleted')
  }

  const { microsoft } = await getMGraphClient(credential)
  if (!microsoft) {
    throw new Error('Failed to get a client')
  }

  return { microsoft }
}

async function contactNewId(MicrosoftClient, contacts) {
  const newContactIds = await MicrosoftClient.updateIdToImmutableId(contacts.map(x => x.remote_id))
  Context.log('microsoftContactsMigration - New ids requested')

  contacts = contacts.map((contact)=> {
    if(newContactIds.value) {
      const newRemoteId = newContactIds.value.find(x => x.sourceId === contact.remote_id)
      if(newRemoteId?.targetId) {
        contact.new_remote_id = newRemoteId.targetId;
      } else {
        contact.new_remote_id = 'not_found'
      }
      return {id: contact.id, new_remote_id: contact.new_remote_id}
    } else {
      return {id: contact.id, new_remote_id: 'error'}
    }
  })

  await updateContactIds(JSON.stringify(contacts))
  Context.log('microsoftContactsMigration - New ids updated')
}

module.exports = {
  async contactsMigration(data) {
    try {
      const { cid, contacts } = data
      Context.log('microsoftContactsMigration - Job Started', cid)

      const { microsoft } = await prepare(cid)

      await contactNewId(microsoft, contacts)

      Context.log(`microsoftContactsMigration - Records updated, len:${contacts.length}`)
      Context.log('microsoftContactsMigration - Job Finished')
    } catch (err) {
      // @ts-ignore
      Context.log(`microsoftContactsMigration - ${err.message}`)
    }
  },

}
