const db  = require('../../utils/db.js')
const Orm = require('../Orm/registry')

const MicrosoftSyncHistory = {}



MicrosoftSyncHistory.getAll = async (ids) => {
  return await db.select('microsoft/sync_history/get', [ids])
}

MicrosoftSyncHistory.getSyncHistory = async (id) => {
  const credentials = await MicrosoftSyncHistory.getAll([id])

  if (credentials.length < 1)
    throw Error.ResourceNotFound(`Microsoft-SyncHistory ${id} not found`)

  return credentials[0]
}

MicrosoftSyncHistory.getMCredentialLastSyncHistory = async (user, brand, microsoft_credential_id) => {
  const ids = await db.selectIds('microsoft/sync_history/credential_last_sync', [user, brand, microsoft_credential_id])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Microsoft-SyncHistory for M-Credential ${microsoft_credential_id} not found`)

  return await MicrosoftSyncHistory.getSyncHistory(ids[0])
}

MicrosoftSyncHistory.addSyncHistory = async (body) => {
  return db.insert('microsoft/sync_history/insert',[
    body.user,
    body.brand,
    body.microsoft_credential,
    body.synced_contacts_num || 0,
    body.contacts_total || 0,
    body.synced_messages_num || 0,
    body.messages_total || 0,
    body.sync_duration || 0,
    body.status
  ])
}


Orm.register('microsoft_sync_history', 'MicrosoftSyncHistory', MicrosoftSyncHistory)

module.exports = MicrosoftSyncHistory
