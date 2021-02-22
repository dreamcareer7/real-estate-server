const db    = require('../../../utils/db.js')
const squel = require('../../../utils/squel_extensions')


const bulkUpdate = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_contacts')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential, remote_id'], {
        photo: squel.rstr('EXCLUDED.photo'),
        processed_photo: squel.rstr('EXCLUDED.processed_photo')
      })
      .returning('id')

    q.name = 'microsoft/contacts/bulk_update'

    return db.select(q)
  })  
}

/** @typedef {{credentialId: string, folderId: string, syncToken: string}} UpdateFolderSyncTokenRecord */

/**
 * Finds a row using credential and folder ID and updates its sync-token
 * @param {object}
 * @param {UpdateFolderSyncToken} record 
 * @returns {Promise<number>} number of updated rows (should be 1 or 0)
 */
const updateFolderSyncToken = async ({
  credentialId,
  folderId,
  syncToken,
}) => {
  return db.update('microsoft/contact_folder/update_sync_token', [
    syncToken,
    credentialId,
    folderId,
  ])
}


module.exports = {
  bulkUpdate,
  updateFolderSyncToken,
}
