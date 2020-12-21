const db    = require('../../utils/db.js')
const squel = require('../../utils/squel_extensions')



const insert = async (records) => {
  if (records.length === 0) {
    return []
  }

  return db.select('contact_integration/insert', [JSON.stringify(records)])
}

const gupsert = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('contact_integration', 'cali')
      .set('etag = uv.etag')
      .set('local_etag = uv.etag')
      .set('contact = COALESCE(uv.contact::uuid, cali.contact::uuid)')
      .set('deleted_at = null')
      .from('update_values', 'uv')
      .where('cali.google_id = uv.google_id::uuid')

    q.name = 'contact_integration/gupsert'

    return db.update(q, [])
  })  
}

const mupsert = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('contact_integration', 'cali')
      .set('etag = uv.etag')
      .set('local_etag = uv.etag')
      .set('contact = COALESCE(uv.contact::uuid, cali.contact::uuid)')
      .set('deleted_at = null')
      .from('update_values', 'uv')
      .where('cali.microsoft_id = uv.microsoft_id::uuid')

    q.name = 'contact_integration/mupsert'

    return db.update(q, [])
  })  
}


module.exports = {
  insert,
  gupsert,
  mupsert
}