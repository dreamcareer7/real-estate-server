const db = require('../../utils/db')
const squel = require('../../utils/squel_extensions')


const storeId = async (id, mailgun_id) => {
  const trimmed = mailgun_id.replace(/^</, '').replace(/>$/, '')
  await db.query.promise('email/store-id', [id, trimmed])
}

const storeGoogleId = async (id, google_id) => {
  await db.query.promise('email/store_google_id', [id, google_id])
}

const storeMicrosoftId = async (id, microsoft_id) => {
  await db.query.promise('email/store_microsoft_id', [id, microsoft_id])
}

const storeMicrosoftIds = async (records) => {
  if (records.length === 0) {
    return []
  }

  return await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
    const q = squel
      .update()
      .withValues('update_values', chunk)
      .table('emails', 'e')
      .set('microsoft_id = uv.microsoft_id')
      .from('update_values', 'uv')
      .where('e.id = uv.id::uuid')

    q.name = 'email/store_microsoft_ids'

    return db.update(q, [])
  })  
}


module.exports = { storeId, storeGoogleId, storeMicrosoftId, storeMicrosoftIds }