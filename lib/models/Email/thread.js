const { EventEmitter } = require('events')

const db  = require('../../utils/db.js')
const Orm = require('../Orm')

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
  }
}

const Model = new EmailThread

Orm.register('email_thread', 'EmailThread', Model)

module.exports = Model
