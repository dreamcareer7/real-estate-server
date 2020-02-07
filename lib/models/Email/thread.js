const { EventEmitter } = require('events')

const db = require('../../utils/db.js')
const sq = require('../../utils/squel_extensions')

const Orm = require('../Orm')
const GoogleCredential = require('../Google/credential')
const MicrosoftCredential = require('../Microsoft/credential')

class EmailThread extends EventEmitter {
  /**
   * @param {string[]} ids
   */
  async getAll(ids) {
    const associations = Orm.getEnabledAssociations()

    return db.select('email/thread/get', [
      ids,
      associations
    ])
  }

  /**
   * @param {UUID} user 
   * @param {UUID} brand 
   * @param {*} query 
   */
  async filter(user, brand, query) {
    const gc_ids = await GoogleCredential.findByUser(user, brand)
    const mc_ids = await MicrosoftCredential.findByUser(user, brand)

    if (!gc_ids || !mc_ids || (gc_ids.length < 1 && mc_ids.length < 1)) return {
      ids: [],
      total: 0
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
   * @param {string} id 
   * @param {UUID} user 
   * @param {UUID} brand 
   */
  async hasAccess(id, user, brand) {
    const thread = await this.get(id)

    const credential = thread.google_credential ?
      await GoogleCredential.get(thread.google_credential) :
      await MicrosoftCredential.get(thread.microsoft_credential)

    return credential.user === user && credential.brand === brand
  }

  /**
   * @param {string[]} ids
   * @param {'google' | 'microsoft'} source
   */
  async update(ids, source) {
    await db.update(`email/thread/update_${source}`, [
      ids
    ])

    this.emit('update', {
      threads: ids
    })  
  }

  /**
   * @param {string[]} ids 
   */
  async prune(ids) {
    await db.update('email/thread/prune', [
      ids
    ])

    this.emit('update', {
      threads: ids
    })  
  }
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

const Model = new EmailThread

Orm.register('email_thread', 'EmailThread', Model)

module.exports = Model
