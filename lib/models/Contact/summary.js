const db = require('../../utils/db.js')
const Orm = require('../Orm')

class ContactSummary {
  /**
   * Get contact summaries by id
   * @param {UUID[]} ids
   * @returns {Promise<IContactSummary[]>}
   */
  async getAll(ids) {
    return await db.select('contact/summary/get', [
      ids
    ])
  }

  /**
   * @param {UUID[]} ids 
   * @returns {Promise<UUID | undefined>}
   */
  async create(ids) {
    if (ids.length === 0) return undefined

    return await db.insert('contact/summary/create', [
      ids
    ])
  }

  async update(ids) {
    if (ids.length === 0) return undefined

    return await db.update('contact/summary/update', [
      ids
    ])
  }

  async delete(ids) {
    if (ids.length === 0) return undefined

    return await db.update('contact/summary/delete', [
      ids
    ])
  }
}

const Model = new ContactSummary

Orm.register('contact_summary', 'ContactSummary', Model)

module.exports = Model
