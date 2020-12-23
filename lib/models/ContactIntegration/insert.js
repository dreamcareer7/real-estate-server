const db    = require('../../utils/db.js')
const squel = require('../../utils/squel_extensions')



const insert = async (records) => {
  if (records.length === 0) {
    return []
  }

  return db.select('contact_integration/insert', [JSON.stringify(records)])
}

/**
 * @param {Any[]} records
 */
const bulkUpsert = async (records) => {
  if (records.length === 0) {
    return []
  }

  // *** Tip: This method dows not works due to not having a propert on-conflict unique constraint

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .insert()
      .into('contact_integration')
      .setFieldsRows(chunk)
      .onConflict(['google_id', 'microsoft_id'], {
        google_id: squel.rstr('EXCLUDED.google_id'),
        microsoft_id: squel.rstr('EXCLUDED.microsoft_id'),
        contact: squel.rstr('EXCLUDED.contact'),
        origin: squel.rstr('EXCLUDED.origin'),
        etag: squel.rstr('EXCLUDED.etag'),
        local_etag: squel.rstr('EXCLUDED.local_etag')
      })
      .returning('id, google_id, microsoft_id, contact, origin, etag, local_etag')

    q.name = 'contact_integration/bulk_upsert'

    return db.select(q)
  })  
}

const gupsert = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('contact_integration', 'contactint')
      .set('etag = uv.etag')
      .set('local_etag = uv.etag')
      .set('contact = COALESCE(uv.contact::uuid, contactint.contact::uuid)')
      .set('deleted_at = null')
      .from('update_values', 'uv')
      .where('contactint.google_id = uv.google_id::uuid')

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
      .table('contact_integration', 'contactint')
      .set('etag = uv.etag')
      .set('local_etag = uv.etag')
      .set('contact = COALESCE(uv.contact::uuid, contactint.contact::uuid)')
      .set('deleted_at = null')
      .from('update_values', 'uv')
      .where('contactint.microsoft_id = uv.microsoft_id::uuid')

    q.name = 'contact_integration/mupsert'

    return db.update(q, [])
  })  
}


module.exports = {
  insert,
  bulkUpsert,
  gupsert,
  mupsert
}