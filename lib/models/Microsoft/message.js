const db    = require('../../utils/db.js')
const Orm   = require('../Orm')
const squel = require('../../utils/squel_extensions')


const MicrosoftMessage = {}



MicrosoftMessage.getAll = async (ids) => {
  const messages = await db.select('microsoft/message/get', [ids])

  return messages
}

MicrosoftMessage.get = async (id) => {
  const messages = await MicrosoftMessage.getAll([id])

  if (messages.length < 1)
    return null

  return messages[0]
}

MicrosoftMessage.create = async (records) => {
  return await db.chunked(records, 9, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_messages')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'message_id'], {
        headers: squel.rstr('EXCLUDED.headers'),
        updated_at: squel.rstr('now()')
      })
      .returning('microsoft_messages.id, microsoft_messages.microsoft_credential, microsoft_messages.message_id, microsoft_messages.headers')

    q.name = 'microsoft/message/bulk_upsert'

    return db.select(q)
  })  
}


Orm.register('microsoft_message', 'MicrosoftMessage', MicrosoftMessage)

module.exports = MicrosoftMessage