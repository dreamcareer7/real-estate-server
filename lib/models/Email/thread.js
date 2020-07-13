const _ = require('lodash')
const { EventEmitter } = require('events')

const db = require('../../utils/db.js')
const sq = require('../../utils/squel_extensions')

const Socket = require('../Socket')
const Context = require('../Context/index.js')
const GoogleCredential = require('../Google/credential')
const MicrosoftCredential = require('../Microsoft/credential')
const Gmail = require('../Google/gmail')
const Outlook = require('../Microsoft/outlook')
const Orm = {
  ...require('../Orm/registry'),
  ...require('../Orm/context'),
}

class EmailThread extends EventEmitter {
  /**
   * @param {string[]} ids
   */
  async getAll(ids) {
    const associations = Orm.getEnabledAssociations()

    const threads = await db.select('email/thread/get', [ids, associations])

    const { select } = Orm.getPublicFields()
    const shouldFetchSnippet = Array.isArray(select.email_thread) && select.email_thread.includes('snippet')

    if (shouldFetchSnippet) {
      const google_threads = new Map()
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
        const bodies = await Gmail.fetchMessage(gc, ts.map(t => t.last_message_id))

        for (const t of ts) {
          if (bodies[t.last_message_id]) t.snippet = bodies[t.last_message_id].snippet
        }
      }

      for (const [mc, ts] of microsoft_threads.entries()) {
        const bodies = await Outlook.fetchMessage(mc, ts.map(t => t.last_message_id), true)

        for (const t of ts) {
          if (bodies[t.last_message_id]) t.snippet = bodies[t.last_message_id].snippet
        }
      }
    }

    return threads
  }

  /**
   * @param {UUID} user
   * @param {UUID} brand
   * @param {{ q?: string; is_read?: boolean; has_attachments?: boolean; ids?: UUID[]; next?: Record<string, string>; } & PaginationOptions} query
   */
  async filter(user, brand, query) {
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

      if (query.start) q.offset(query.start)
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
   * @param {string} id
   */
  async get(id) {
    const [thread] = await this.getAll([id])

    if (!thread) throw Error.ResourceNotFound(`EmailThread ${id} not found.`)

    return thread
  }

  /**
   * @param { { google_credential?: UUID; microsoft_credential?: UUID; } } resource
   */
  getCredential(resource) {
    return resource.google_credential
      ? GoogleCredential.get(resource.google_credential)
      : MicrosoftCredential.get(resource.microsoft_credential)
  }

  /**
   * @param {string} id
   * @param {UUID} user
   * @param {UUID} brand
   */
  async hasAccess(id, user, brand) {
    const thread = await this.get(id)

    const credential = await this.getCredential(thread)

    return credential.user === user && credential.brand === brand
  }

  /**
   * @param {string[]} ids
   * @param {UUID} microsoft_credential
   */
  async updateMicrosoft(ids, microsoft_credential) {
    ids = await db.selectIds('email/thread/update_microsoft', [ids])
    const credential = await this.getCredential({ microsoft_credential })

    sendSocketEvent('email_thread:update', credential.user, {
      microsoft_credential,
      threads: _.uniq(ids).slice(0, 50)
    })

    this.emit('update', {
      microsoft_credential,
      threads: _.uniq(ids)
    })
  }

  /**
   * @param {string[]} ids
   * @param {UUID} google_credential
   */
  async updateGoogle(ids, google_credential) {
    ids = await db.selectIds('email/thread/update_google', [ids])
    const credential = await this.getCredential({ google_credential })

    if (ids.length > 0) {
      sendSocketEvent('email_thread:update', credential.user, {
        google_credential,
        threads: _.uniq(ids).slice(0, 50)
      })

      this.emit('update', {
        google_credential,
        threads: _.uniq(ids)
      })
    }
  }

  /**
   * @param {string[]} ids
   * @param { { google_credential?: UUID; microsoft_credential?: UUID; } } credentials
   */
  async prune(ids, credentials) {
    const deleted_ids = await db.selectIds('email/thread/prune', [ids])
    const credential = await this.getCredential(credentials)

    if (deleted_ids.length > 0) {
      sendSocketEvent('email_thread:delete', credential.user, {
        ...credentials,
        threads: _.uniq(deleted_ids).slice(0, 50)
      })

      this.emit('update', {
        ...credentials,
        threads: _.uniq(deleted_ids)
      })
    }
  }
}

function sendSocketEvent(event, user, args) {
  Context.log(`>>> (Socket) Sending ${event} event to user ${user}`)
  Socket.send(
    event,
    user,
    [args],

    (err) => {
      if (err)
        Context.error('>>> (Socket) Error sending thread prune socket event.', err)
    }
  )
}

EmailThread.prototype.associations = {
  messages: {
    collection: true,
    polymorphic: true,
    enabled: false
  },
  contacts: {
    collection: true,
    model: 'Contact',
    enabled: false
  }
}

const Model = new EmailThread()

Orm.register('email_thread', 'EmailThread', Model)

module.exports = Model
