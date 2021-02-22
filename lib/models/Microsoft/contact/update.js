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

/**
 * Bulk updates sync-token
 * @see updateFolderSyncToken
 * @typedef {{microsoft_credential: string, folder_id: string, sync_token: string}} UpdateFolderSyncTokenRecord
 * @param {UpdateFolderSyncTokenRecord[]} records
 * @returns {Promise}
 */
const bulkUpdateFolderSyncTokens = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('microsoft_contact_folders', 'mcfolders')
      .set('sync_token = uv.sync_token')
      .set('updated_at = now()')
      .from('update_values', 'uv')
      .where('mcfolders.microsoft_credenial = uv.microsoft_credenial::uuid')
      .where('mcfolders.folder_id = uv.folder_id::text')

    q.name = 'microsoft_contact_folders/bulk_update_sync_tokens'

    return db.update(q, [])
  })  
}


module.exports = {
  bulkUpdate,
  bulkUpdateFolderSyncTokens,
}
