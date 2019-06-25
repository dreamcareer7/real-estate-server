const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')


const GoogleMessage = {}



GoogleMessage.getAll = async (ids) => {
  const messages = await db.select('google/message/get', [ids])

  return messages
}

GoogleMessage.get = async (id) => {
  const messages = await GoogleMessage.getAll([id])

  if (messages.length < 1)
  return null

  return messages[0]
}

GoogleMessage.create = async (records) => {
  return await db.chunked(records, 9, (chunk, i) => {
    const q = squel
      .insert()
      .into('google_messages')
      .setFieldsRows(chunk)
      .onConflict(['google_credential', 'message_id'], {
        headers: squel.rstr('EXCLUDED.headers'),
        updated_at: squel.rstr('now()')
      })
      .returning('google_messages.id, google_messages.google_credential, google_messages.message_id, google_messages.headers')

    q.name = 'google/message/bulk_upsert'

    return db.select(q)
  })  
}


Orm.register('google_message', 'GoogleMessage', GoogleMessage)

module.exports = GoogleMessage