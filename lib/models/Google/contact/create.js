const db = require('../../../utils/db.js')
const squel = require('@rechat/squel').useFlavour('postgres')


const addContactGroup = async (credential, contactGroup) => {
  return db.insert('google/contact_group/insert', [credential.id, contactGroup.entry_id, contactGroup.entry]) 
}

const create = async (records) => {
  return await db.chunked(records, 3, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_contacts')
      .setFieldsRows(chunk)
      .onConflict(['google_credential', 'entry_id'], {
        entry: squel.rstr('EXCLUDED.entry'),
        updated_at: squel.rstr('now()')
      })
      .returning('google_contacts.id, google_contacts.google_credential, google_contacts.entry_id, google_contacts.entry')

    q.name = 'google/contact/bulk_upsert'

    return db.select(q)
  })  
}


module.exports = {
  addContactGroup,
  create
}