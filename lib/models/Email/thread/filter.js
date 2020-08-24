const db = require('../../../utils/db.js')
const sq = require('../../../utils/squel_extensions')

const GoogleCredential    = require('../../Google/credential')
const MicrosoftCredential = require('../../Microsoft/credential')
const Gmail   = require('../../Google/gmail')
const Outlook = require('../../Microsoft/outlook')


/**
 * @param {UUID} user
 * @param {UUID} brand
 * @param {{ q?: string; is_read?: boolean; has_attachments?: boolean; ids?: UUID[]; next?: Record<string, string>; } & PaginationOptions} query
 */
const filter = async (user, brand, query) => {
  const gc_ids = await GoogleCredential.findByUser(user, brand)
  const mc_ids = await MicrosoftCredential.findByUser(user, brand)

  /** @type {Record<string, string | null>} */
  const next = Object.fromEntries([...gc_ids, ...mc_ids].map(cid => [cid, null]))

  if (!gc_ids || !mc_ids || (gc_ids.length < 1 && mc_ids.length < 1)) {
    return {
      ids: [],
      total: 0,
      next
    }
  }

  const q = sq
    .select()
    .field('et.id')
    .field('COUNT(*) OVER()::INT', 'total')
    .from('email_threads', 'et')
    .where('deleted_at IS NULL')

  const cred_expr = sq.expr()

  if (Array.isArray(gc_ids) && gc_ids.length > 0) {
    cred_expr.or('google_credential = ANY(?)', sq.SqArray.from(gc_ids || []))
  }

  if (Array.isArray(mc_ids) && mc_ids.length > 0) {
    cred_expr.or('microsoft_credential = ANY(?)', sq.SqArray.from(mc_ids || []))
  }

  q.where(cred_expr)

  if (query.q) {
    /** @type {Record<string, { threadKeys: string[]; next: string; }>} */
    const p = {}

    for (const gc_id of gc_ids) {
      p[gc_id] = await Gmail.search(gc_id, query.q, query.next ? query.next[gc_id] : undefined)
      next[gc_id] = p[gc_id].next
    }
    for (const mc_id of mc_ids) {
      p[mc_id] = await Outlook.search(mc_id, query.q, query.next ? query.next[mc_id] : undefined)
      next[mc_id] = p[mc_id].next
    }

    query.ids = Object.values(p).flatMap(v => v.threadKeys)

  } else {

    if (query.hasOwnProperty('is_read')) {
      q.where('is_read = ?', Boolean(query.is_read))
    }

    if (query.hasOwnProperty('has_attachments')) {
      q.where('has_attachments = ?', Boolean(query.has_attachments))
    }

    if (query.start) {
      q.offset(query.start)
    }

    q.limit(query.limit || 50)
  }

  if (Array.isArray(query.ids)) {
    q.where('id = ANY(?)', sq.SqArray.from(query.ids))
  }

  q.order('last_message_date', false)

  // @ts-ignore
  q.name = 'email/thread/filter'

  const rows = await db.select(q)

  if (rows.length === 0) {
    return {
      ids: [],
      total: 0,
      next
    }
  }

  return {
    ids: rows.map(r => r.id),
    total: rows[0].total,
    next
  }
}

/**
 * @param { { google_credential?: UUID; microsoft_credential?: UUID; } } resource
 */
const getCredential = (resource) => {
  return resource.google_credential
    ? GoogleCredential.get(resource.google_credential)
    : MicrosoftCredential.get(resource.microsoft_credential)
}


module.exports = {
  filter,
  getCredential
}