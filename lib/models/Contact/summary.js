const db = require('../../utils/db.js')
const Context = require('../Context/index.js')
const Orm = require('../Orm/registry')

class ContactSummary {
  /**
   * Get contact summaries by id
   * @param {UUID[]} ids
   * @returns {Promise<IContactSummary[]>}
   */
  async getAll(ids) {
    return db.select('contact/summary/get', [
      ids
    ])
  }

  /**
   * @param {UUID[]} ids 
   */
  async update(ids) {
    if (ids.length === 0) return 0
    if (ids.length > 20) {
      Context.log(`[ContactSummary] Updating summary for ${ids.length} contacts. (Only 20+ are logged)`)
      db.enableLogging()
    }

    return db.update('contact/update_summary', [
      ids
    ])
  }

  /**
   * Update only the tags field
   * FIXME: Turn this into something more general that works for any combination
   *  of attributes
   * @param {UUID} brand
   */
  updateTags(brand) {
    return db.update('contact/summary/update_tags', [brand])
  }
}

const Model = new ContactSummary

Orm.register('contact_summary', 'ContactSummary', Model)

module.exports = Model
