const Context  = require('../../Context')
const { get } = require('../credential/get')
const { getMGraphClient } = require('../plugin/client.js')
const migrationPublisher = require('./publisher')
const { 
  getContactsWithOldId,
  updateContactIds,
  updateContactMigrationStatus,
  getAvailableCredentials,
} = require('./model')

async function prepare(data) {
  const credential = await get(data.cid)
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

async function contactNewId(MicrosoftClient, credential) {
  const limit = 1000
  let offset = 0
  let contacts = []

  do {
    contacts = await getContactsWithOldId(credential, limit, offset)
    Context.log('microsoftContactsMigration - Fetched rows ', contacts.length)
    offset += limit

    const newContactIds = await MicrosoftClient.updateIdToImmutableId(contacts.map(x => x.remote_id))
    Context.log('microsoftContactsMigration - New ids requested')
    contacts = contacts.map((contact)=> {
      const newRemoteId = newContactIds.value.find(x => x.sourceId === contact.remote_id)
      contact.new_remote_id = newRemoteId ? newRemoteId.targetId : null
    })

    await updateContactIds(contacts)
    Context.log('microsoftContactsMigration - New ids updated')
  }
  while (contacts.length === limit)

}

module.exports = {
  async contactsMigration(data) {
    try {
      const { cid } = data
      Context.log('microsoftContactsMigration - Job Started', cid)
  
      const { microsoft } = await prepare(data)
  
      await contactNewId(microsoft, cid)
      
      Context.log('microsoftContactsMigration - All records updated')

      await updateContactMigrationStatus(cid, 'done')
  
      Context.log('microsoftContactsMigration - Job Finished')
  
    } catch (err) {
      // @ts-ignore
      Context.log(`microsoftContactsMigration - ${err.message}`)
    }
  },

  async migrationDue() {
    const credentials = await getAvailableCredentials()
    for (const credential of credentials) {
      const data = {
        cid: credential.id,
        action: 'migrate_contact'
      }
      migrationPublisher.migrateContacts(data)
      await updateContactMigrationStatus(credential.id, 'queued')
    }
  },
}
