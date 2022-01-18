const db = require('../../../utils/db.js')
const squel = require('@rechat/squel').useFlavour('postgres')



/**
 * @param {Object[]} records
 */
const addContactFolders = async (records) => {
  return await db.chunked(records, 3, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_contact_folders')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'folder_id'], {
        microsoft_credential: squel.rstr('EXCLUDED.microsoft_credential'),
        folder_id: squel.rstr('EXCLUDED.folder_id'),
        parent_folder_id: squel.rstr('EXCLUDED.parent_folder_id'),
        display_name: squel.rstr('EXCLUDED.display_name'),
      })
      .returning('id, microsoft_credential, folder_id, display_name, updated_at, created_at')

    q.name = 'microsoft/contact_folder/bulk_upsert'

    return db.select(q)
  }) 
}

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
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_contacts')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'remote_id'], {
        contact: squel.rstr('EXCLUDED.contact'),
        etag: squel.rstr('EXCLUDED.etag'),
        data: squel.rstr('EXCLUDED.data'),
        source: squel.rstr('EXCLUDED.source'),
        parked: squel.rstr('EXCLUDED.parked'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, microsoft_credential, remote_id, contact, data, etag, parked, source')

    q.name = 'microsoft/contact/bulk_create'

    return db.select(q)
  })
}

/**
 * @param {Object} records
 */
const update = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_contacts')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'remote_id'], {
        data: squel.rstr('EXCLUDED.data'),
        etag: squel.rstr('EXCLUDED.etag'),
        parked: squel.rstr('EXCLUDED.parked'),
        processed_photo: squel.rstr('CASE WHEN microsoft_contacts.data->\'photo\' = EXCLUDED.data->\'photo\' THEN TRUE ELSE FALSE END'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, microsoft_credential, remote_id, contact, data, etag, parked, source')

    q.name = 'microsoft/contact/bulk_update'

    return db.select(q)
  })
}


module.exports = {
  addContactFolders,
  addContactFolder,
  create,
  update
}