const db = require('../../../utils/db.js')

const { fetchMessage: fetchGmailMessage }   = require('../../Google/gmail')
const { fetchMessage: fetchOutlookMessage } = require('../../Microsoft/outlook')

const Orm = require('../../Orm/context')


/**
 * @param {string[]} ids
 */
const getAll = async (ids) => {
  const associations = Orm.getEnabledAssociations()

  const threads = await db.select('email/thread/get', [ids, associations])

  const { select } = Orm.getPublicFields()
  const shouldFetchSnippet = Array.isArray(select.email_thread) && select.email_thread.includes('snippet')

  if (shouldFetchSnippet) {
    const google_threads    = new Map()
    const microsoft_threads = new Map()

    for (const t of threads) {
      if (t.google_credential) {
        const ts = google_threads.get(t.google_credential) || []
        google_threads.set(t.google_credential, ts.concat(t))
      }
      if (t.microsoft_credential) {
        const ts = microsoft_threads.get(t.microsoft_credential) || []
        microsoft_threads.set(t.microsoft_credential, ts.concat(t))
      }
    }

    for (const [gc, ts] of google_threads.entries()) {
      const bodies = await fetchGmailMessage(gc, ts.map(t => t.last_message_id))

      for (const t of ts) {
        if (bodies[t.last_message_id]) {
          t.snippet = bodies[t.last_message_id].snippet
        }
      }
    }

    for (const [mc, ts] of microsoft_threads.entries()) {
      const bodies = await fetchOutlookMessage(mc, ts.map(t => t.last_message_id), true)

      for (const t of ts) {
        if (bodies[t.last_message_id]) {
          t.snippet = bodies[t.last_message_id].snippet
        }
      }
    }
  }

  return threads
}

/**
 * @param {string} id
 */
const get = async (id) => {
  const [thread] = await getAll([id])

  if (!thread) {
    throw Error.ResourceNotFound(`EmailThread ${id} not found.`)
  }

  return thread
}


module.exports = {
  getAll,
  get
}