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
        data: squel.rstr('EXCLUDED.data'),
        source: squel.rstr('EXCLUDED.source'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, microsoft_credential, remote_id, contact, data, source')

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
        processed_photo: squel.rstr('CASE WHEN microsoft_contacts.data->\'photo\' = EXCLUDED.data->\'photo\' THEN TRUE ELSE FALSE END'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, microsoft_credential, remote_id, contact, data, source')

    q.name = 'microsoft/contact/update'

    return db.select(q)
  })
}


module.exports = {
  addContactFolder,
  create,
  update
}