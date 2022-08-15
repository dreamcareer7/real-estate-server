
const _ = require('lodash')
const db    = require('../../../utils/db.js')

const EmailThread = require('../../Email/thread/action')
const Emitter = require('./emitter')


/**
 * @param {any[]} records
 * @param {UUID} microsoft_credential
 */
const create = async (records, microsoft_credential) => {
  if (records.length === 0) {
    return []
  }

  const res = await db.select('microsoft/message/bulk_upsert', [JSON.stringify(records)])
  const threads = _.uniq(res.map(r => r.thread_key))
  await EmailThread.updateMicrosoft(threads, microsoft_credential, { event: 'create' })
  Emitter.emit('update', { threads, ids: res.map(r => r.id), messages: records, microsoft_credential })

  return res
}


module.exports = {
  create
}
