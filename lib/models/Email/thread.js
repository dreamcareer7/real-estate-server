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
