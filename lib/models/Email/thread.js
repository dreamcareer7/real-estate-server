const { EventEmitter } = require('events')

const db  = require('../../utils/db.js')
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
