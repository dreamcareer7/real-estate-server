const db    = require('../../../utils/db.js')
const squel = require('../../../utils/squel_extensions')


const bulkUpdate = async (records) => {
  if (records.length === 0)
    return []

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_contacts')
      .setFieldsRows(chunk)
      .onConflict(['google_credential, resource_id'], {
        photo: squel.rstr('EXCLUDED.photo'),
        processed_photo: squel.rstr('EXCLUDED.processed_photo')
      })
      .returning('id')

    return db.select(q)
  })  
}


module.exports = {
  bulkUpdate
}