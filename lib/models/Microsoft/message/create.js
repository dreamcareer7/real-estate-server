const _ = require('lodash')
const db    = require('../../../utils/db.js')
// const squel = require('../../../utils/squel_extensions')

const EmailThread = require('../../Email/thread/action')
const Emitter = require('./emitter')


/**
 * @param {any[]} records
 * @param {UUID} microsoft_credential
 */
const create = async (records, microsoft_credential) => {
  if (records.length === 0)
    return []

  // const res = await db.chunked(records, Object.keys(records[0]).length, (chunk, i) => {
  //   const q = squel
  //     .insert()
  //     .into('microsoft_messages')
  //     .setFieldsRows(chunk)
  //     .onConflict(['microsoft_credential', 'message_id'], {
  //       message_id: squel.rstr('EXCLUDED.message_id'),
  //       thread_id: squel.rstr('EXCLUDED.thread_id'),
  //       thread_key: squel.rstr('EXCLUDED.thread_key'),
  //       in_reply_to: squel.rstr('EXCLUDED.in_reply_to'),
  //       in_bound: squel.rstr('EXCLUDED.in_bound'),
  //       is_read: squel.rstr('EXCLUDED.is_read'),
  //       is_archived: squel.rstr('EXCLUDED.is_archived'),
  //       recipients: squel.rstr('EXCLUDED.recipients'),

  //       subject: squel.rstr('EXCLUDED.subject'),
  //       has_attachments: squel.rstr('EXCLUDED.has_attachments'),
  //       attachments: squel.rstr('EXCLUDED.attachments'),

  //       from_raw: squel.rstr('EXCLUDED.from_raw'),
  //       to_raw: squel.rstr('EXCLUDED.to_raw'),
  //       cc_raw: squel.rstr('EXCLUDED.cc_raw'),
  //       bcc_raw: squel.rstr('EXCLUDED.bcc_raw'),

  //       '"from"': squel.rstr('EXCLUDED.from'),
  //       '"to"': squel.rstr('EXCLUDED.to'),
  //       cc: squel.rstr('EXCLUDED.cc'),
  //       bcc: squel.rstr('EXCLUDED.bcc'),

  //       message_created_at: squel.rstr('EXCLUDED.message_created_at'),
  //       message_date: squel.rstr('EXCLUDED.message_date'),

  //       deleted_at: squel.rstr('EXCLUDED.deleted_at'),
  //       updated_at: squel.rstr('now()')
  //     })
  //     .returning('id, microsoft_credential, internet_message_id, message_id, thread_id, thread_key')

  //   q.name = `microsoft/message/bulk_upsert#${i}`

  //   return db.select(q)
  // })

  const res = await db.select('microsoft/message/bulk_upsert', [JSON.stringify(records)])
  const threads = _.uniq(res.map(r => r.thread_key))
  await EmailThread.updateMicrosoft(threads, microsoft_credential)
  Emitter.emit('update', { threads, ids: res.map(r => r.id), messages: records, microsoft_credential })

  return res
}


module.exports = {
  create
}