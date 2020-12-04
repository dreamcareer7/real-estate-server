const db    = require('../../../utils/db.js')
const squel = require('../../../utils/squel_extensions')


const bulkUpdate = async (records) => {
  if (records.length === 0)
    return []

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_contacts')
      .setFieldsRows(chunk)
      .onConflict(['id'], {
        photo: squel.rstr('EXCLUDED.photo'),
        processed_photo: squel.rstr('EXCLUDED.processed_photo')
      })
      .returning('id')

    q.name = 'microsoft/contacts/bulk_update'

    return db.select(q)
  })  
}


module.exports = {
  bulkUpdate
}