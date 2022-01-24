const Context  = require('../../Context')
const { get } = require('../credential/get')
const { getMGraphClient } = require('../plugin/client')
const { 
  updateContactIds,
  updateMessageIds,
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
        contact.new_remote_id = newRemoteId.targetId
      } else {
        contact.new_remote_id = 'not_found'
      }
      return {id: contact.id, new_remote_id: contact.new_remote_id}
    }
    return {id: contact.id, new_remote_id: 'error'}
  })

  await updateContactIds(contacts)
  Context.log('microsoftContactsMigration - New ids updated')
}

async function messageNewId(MicrosoftClient, messages) {
  const newMessageIds = await MicrosoftClient.updateIdToImmutableId(messages.map(x => x.message_id))
  Context.log('microsoftMessagesMigration - New ids requested')

  messages = messages.map((message)=> {
    if(newMessageIds.value) {
      const newMessageId = newMessageIds.value.find(x => x.sourceId === message.message_id)
      if(newMessageId?.targetId) {
        message.new_message_id = newMessageId.targetId
      } else {
        message.new_message_id = 'not_found'
      }
      return {id: message.id, new_message_id: message.new_message_id}
    }
    return {id: message.id, new_message_id: 'error'}
  })

  await updateMessageIds(messages)
  Context.log('microsoftMessagesMigration - New ids updated')
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

  async messagesMigration(data) {
    try {
      const { cid, messages } = data
      Context.log('microsoftMessagesMigration - Job Started', cid)

      const { microsoft } = await prepare(cid)

      await messageNewId(microsoft, messages)

      Context.log(`microsoftMessagesMigration - Records updated, len:${messages.length}`)
      Context.log('microsoftMessagesMigration - Job Finished')
    } catch (err) {
      // @ts-ignore
      Context.log(`microsoftMessagesMigration - ${err.message}`)
    }
  },
}
