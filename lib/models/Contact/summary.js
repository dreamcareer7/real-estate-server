const db = require('../../utils/db.js')
const Orm = require('../Orm/registry')

class ContactSummary {
  /**
   * Get contact summaries by id
   * @param {UUID[]} ids
   * @returns {Promise<IContactSummary[]>}
   */
  async getAll(ids, get_summary = false) {
    return await db.select('contact/summary/get', [
      ids
    ])
  }

  /**
   * @param {UUID[]} ids 
   */
  async update(ids) {
    if (ids.length === 0) return 0

    return db.update('contact/update_summary', [
      ids
    ])
  }
}

const Model = new ContactSummary

Orm.register('contact_summary', 'ContactSummary', Model)

module.exports = Model
