const _ = require('lodash')

const db = require('../../utils/db.js')
const Orm = require('../Orm')

class ContactSummary {
  /**
   * Get contact summaries by id
   * @param {UUID[]} ids
   * @returns {Promise<IContactSummary[]>}
   */
  static async getAll(ids) {
    return await db.select('contact/summary/get', [
      ids
    ])
  }
}

Orm.register('contact_summary', 'ContactSummary', ContactSummary)

module.exports = ContactSummary
