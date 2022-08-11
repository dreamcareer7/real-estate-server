const db = require('../../../utils/db.js')
const sq = require('../../../utils/squel_extensions')

const Gmail   = require('../../Google/gmail')
const Outlook = require('../../Microsoft/outlook')

const Context = require('../../Context')

const { get: getGoogleCredential, getByUser: getGoogleCredentialByUser }       = require('../../Google/credential/get')
const { get: getMicrosoftCredential, getByUser: getMicrosoftCredentialByUser } = require('../../Microsoft/credential/get')


/**
 * @param {UUID} user
 * @param {UUID} brand
 * @param {{ q?: string; is_read?: boolean; has_attachments?: boolean; ids?: UUID[]; next?: Record<string, string>; } & PaginationOptions} query
 */
const filter = async (user, brand, query) => {
  const gCredentials = await getGoogleCredentialByUser(user, brand)
  const mCredentials = await getMicrosoftCredentialByUser(user, brand)
  
  const gc_ids = gCredentials.filter(c => { if (c.scope_summary && Array.isArray(c.scope_summary) && c.scope_summary.includes('mail.read')) return true }).map(c => c.id)
  const mc_ids = mCredentials.filter(c => { if (c.scope_summary && Array.isArray(c.scope_summary) && c.scope_summary.includes('mail.read')) return true }).map(c => c.id)

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

  Context.log(q.toString())

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
    ? getGoogleCredential(resource.google_credential)
    : getMicrosoftCredential(resource.microsoft_credential)
}


module.exports = {
  filter,
  getCredential
}
