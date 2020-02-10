const { EventEmitter } = require('events')

const db = require('../../utils/db.js')
const sq = require('../../utils/squel_extensions')

const Socket = require('../Socket.js')
const Orm = require('../Orm')
const Context = require('../Context/index.js')
const GoogleCredential = require('../Google/credential')
const MicrosoftCredential = require('../Microsoft/credential')

class EmailThread extends EventEmitter {
  /**
   * @param {string[]} ids
   */
  async getAll(ids) {
    const associations = Orm.getEnabledAssociations()

    return db.select('email/thread/get', [ids, associations])
  }

  /**
   * @param {UUID} user
   * @param {UUID} brand
   * @param {*} query
   */
  async filter(user, brand, query) {
    const gc_ids = await GoogleCredential.findByUser(user, brand)
    const mc_ids = await MicrosoftCredential.findByUser(user, brand)

    if (!gc_ids || !mc_ids || (gc_ids.length < 1 && mc_ids.length < 1)) {
      return {
        ids: [],
        total: 0
      }
    }

    const q = sq
      .select()
      .field('et.id')
      .field('COUNT(*) OVER()::INT', 'total')
      .from('email_threads', 'et')

    const cred_expr = sq.expr()
    if (Array.isArray(gc_ids) && gc_ids.length > 0) {
      cred_expr.or('google_credential = ANY(?)', sq.SqArray.from(gc_ids || []))
    }
    if (Array.isArray(mc_ids) && mc_ids.length > 0) {
      cred_expr.or('microsoft_credential = ANY(?)', sq.SqArray.from(mc_ids || []))
    }

    q.where(cred_expr)

    if (query.hasOwnProperty('is_read')) {
      q.where('is_read = ?', Boolean(query.is_read))
    }

    if (query.hasOwnProperty('has_attachments')) {
      q.where('has_attachments = ?', Boolean(query.has_attachments))
    }

    if (Array.isArray(query.ids)) {
      q.where('id = ANY(?)', sq.SqArray.from(query.ids))
    }

    if (query.start) q.offset(query.start)

    q.limit(query.limit || 50)
    q.order('last_message_date', false)

    // @ts-ignore
    q.name = 'email/thread/filter'

    const rows = await db.select(q)

    if (rows.length === 0) {
      return {
        ids: [],
        total: 0
      }
    }

    return {
      ids: rows.map(r => r.id),
      total: rows[0].total
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
    await db.update('email/thread/update_microsoft', [ids])
    const credential = await this.getCredential({ microsoft_credential })

    sendSocketEvent('email_thread:update', credential.user)
    this.emit('update', {
      microsoft_credential,
      threads: ids
    })
  }

  /**
   * @param {string[]} ids
   * @param {UUID} google_credential
   */
  async updateGoogle(ids, google_credential) {
    await db.update('email/thread/update_google', [ids])
    const credential = await this.getCredential({ google_credential })

    sendSocketEvent('email_thread:update', credential.user)
    this.emit('update', {
      google_credential,
      threads: ids
    })
  }

  /**
   * @param {string[]} ids
   * @param { { google_credential?: UUID; microsoft_credential?: UUID; } } credentials
   */
  async prune(ids, credentials) {
    const deleted_ids = await db.selectIds('email/thread/prune', [ids])
    const credential = await this.getCredential(credentials)

    sendSocketEvent('email_thread:delete', credential.user)
    this.emit('update', {
      ...credentials,
      threads: deleted_ids
    })
  }
}

function sendSocketEvent(event, user, ids) {
  Socket.send(
    event,
    user,
    ids,

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
