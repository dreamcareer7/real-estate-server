const db = require('../../../utils/db.js')
const squel = require('@rechat/squel').useFlavour('postgres')


/**
 * @param {Object} credential
 * @param {Object} contactFolder
 */
const addContactFolder = async (credential, contactFolder) => {
  return db.insert('microsoft/contact_folder/insert', [credential.id, contactFolder.folder_id, contactFolder.parent_folder_id, contactFolder.display_name])
}

/**
 * @param {Object} records
 */
const create = async (records) => {
  return await db.chunked(records, 4, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_contacts')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'remote_id'], {
        data: squel.rstr('EXCLUDED.data'),
        source: squel.rstr('EXCLUDED.source'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, microsoft_credential, remote_id, data, source')

    q.name = 'microsoft/contact/bulk_upsert'

    return db.select(q)
  })  
}


module.exports = {
  addContactFolder,
  create
}