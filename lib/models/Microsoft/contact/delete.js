const db = require('../../../utils/db.js')



/**
 * @param {UUID} credentialId
 */
const removeFoldersByCredential = async (credentialId) => {
  await db.select('microsoft/contact_folder/remove_by_credential', [credentialId])
}

/**
 * @param {UUID[]} ids
 */
const deleteMany = async function (ids) {
  await db.select('microsoft/contact/delete', [ids])
}

/**
 * @param {UUID[]} ids
 */
const restoreMany = async function (ids) {
  await db.select('microsoft/contact/restore', [ids])
}

/**
 * @param {Object} records
 */
const deleteManyCFolders = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('microsoft_contact_folders', 'mcf')
      .set('deleted_at = now()')
      .from('update_values', 'uv')
      .where('mcf.microsoft_credential = uv.microsoft_credential::uuid')
      .where('mcf.folder_id = uv.folder_id::text')

    q.name = 'microsoft_contact_folders/mupsert'

    return db.update(q, [])
  })  
}

/**
 * @param {UUID[]} ids
 */
const hardDelete = async function (ids) {
  await db.select('microsoft/contact/hard_delete', [ids])
}


module.exports = {
  removeFoldersByCredential,
  deleteManyCFolders,
  deleteMany,
  restoreMany,
  hardDelete
}