const db  = require('../../utils/db.js')
const Orm = require('../Orm')

const GoogleSyncHistory = {}



GoogleSyncHistory.getAll = async (ids) => {
  return await db.select('google/sync_history/get', [ids])
}

GoogleSyncHistory.getSyncHistory = async (id) => {
  const credentials = await GoogleSyncHistory.getAll([id])

  if (credentials.length < 1)
    throw Error.ResourceNotFound(`Google-SyncHistory ${id} not found`)

  return credentials[0]
}

GoogleSyncHistory.addSyncHistory = async (body) => {
  return db.insert('google/sync_history/insert',[
    body.user,
    body.brand,

    body.google_credential,

    body.synced_messages_num || 0,
    body.messages_total || 0,
    body.synced_threads_num || 0,
    body.threads_total || 0,
    body.synced_contacts_num || 0,
    body.contacts_total || 0,
    body.sync_duration || 0,

    body.status
  ])
}

GoogleSyncHistory.getGCredentialLastSyncHistory = async (user, brand, google_credential_id) => {
  const ids = await db.selectIds('google/sync_history/google_credential_last_sync', [user, brand, google_credential_id])

  if (ids.length < 1)
    throw Error.ResourceNotFound(`Google-SyncHistory for G-Credential ${google_credential_id} not found`)

  return await GoogleSyncHistory.getSyncHistory(ids[0])
}


Orm.register('google_sync_history', 'GoogleSyncHistory', GoogleSyncHistory)

module.exports = GoogleSyncHistory