const db = require('../../../utils/db.js')
const squel = require('@rechat/squel').useFlavour('postgres')


/**
 * @param {Object[]} records
 */
const addContactGroups = async (records) => {
  return await db.chunked(records, 3, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_contact_groups')
      .setFieldsRows(chunk)
      .onConflict(['google_credential', 'resource_id'], {
        google_credential: squel.rstr('EXCLUDED.google_credential'),
        resource_id: squel.rstr('EXCLUDED.resource_id'),
        resource: squel.rstr('EXCLUDED.resource'),
        resource_name: squel.rstr('EXCLUDED.resource_name'),
      })
      .returning('id')

    q.name = 'google/contact_group/bulk_upsert'

    return db.select(q)
  }) 
}

/**
 * @param {Object} records
 */
const create = async (records) => {
  return await db.chunked(records, 3, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_contacts')
      .setFieldsRows(chunk)
      .onConflict(['google_credential', 'entry_id'], {
        etag: squel.rstr('EXCLUDED.etag'),
        resource_id: squel.rstr('EXCLUDED.resource_id'),
        resource: squel.rstr('EXCLUDED.resource'),
        other: squel.rstr('EXCLUDED.other'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, google_credential, entry_id, resource_id, resource, other')

    q.name = 'google/contact/bulk_upsert'

    return db.select(q)
  })  
}


module.exports = {
  addContactGroups,
  create
}