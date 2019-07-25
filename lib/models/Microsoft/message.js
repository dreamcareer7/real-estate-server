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

MicrosoftMessage.getMCredentialMessagesNum = async (microsoft_credential) => {
  return await db.select('microsoft/message/count', [microsoft_credential])
}

MicrosoftMessage.create = async (records) => {
  return await db.chunked(records, 6, (chunk, i) => {
    const q = squel
      .insert()
      .into('microsoft_messages')
      .setFieldsRows(chunk)
      .onConflict(['microsoft_credential', 'message_id'], {
        thread_id: squel.rstr('EXCLUDED.thread_id'),
        recipients: squel.rstr('EXCLUDED.recipients::text[]'),
        in_bound: squel.rstr('EXCLUDED.in_bound'),
        data: squel.rstr('EXCLUDED.data'),
        updated_at: squel.rstr('now()')
      })
      .returning('id, microsoft_credential, message_id, thread_id, recipients, in_bound, data')

    q.name = 'microsoft/message/bulk_upsert'

    return db.select(q)
  })  
}


Orm.register('microsoft_message', 'MicrosoftMessage', MicrosoftMessage)

module.exports = MicrosoftMessage