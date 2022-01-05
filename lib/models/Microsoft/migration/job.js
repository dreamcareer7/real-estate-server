const _ = require('lodash')
const Context  = require('../../Context')
const { get } = require('../credential/get')
const { getMGraphClient } = require('../plugin/client.js')
const migrationPublisher = require('./publisher')
const { 
  getContactsWithoutNewId,
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
    const newRemoteId = newContactIds.value.find(x => x.sourceId === contact.remote_id)
    contact.new_remote_id = newRemoteId ? newRemoteId.targetId : null
  })

  await updateContactIds(contacts)
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

  async migrationDue() {
    const records = await getContactsWithoutNewId()
    Context.log('microsoftContactsMigration - Fetched rows ', records.length)

    const groupedRecords = _.groupBy(records, 'cid')
    for(const key in groupedRecords) {
      const data = {
        cid: key,
        contacts: groupedRecords[key].map(x=> ({id: x.id, remote_id: x.remote_id})),
        action: 'migrate_contact'
      }
      migrationPublisher.migrateContacts(data)
    }
  },
}
