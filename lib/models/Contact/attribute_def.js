const db = require('../../utils/db.js')
const Orm = require('../Orm')

class ContactAttributeDef {

  /**
   * Gets attribute defs given their ids. No questions asked.
   * @param {UUID[]} ids 
   * @returns {Promise<IContactAttributeDef[]>}
   */
  static async getAll(ids) {
    return await db.select('contact/attribute_def/get', [
      ids
    ])
  }

  /**
   * Get all global and custom attributes accessible to the user
   * @param {UUID} user_id User id requesting attributes
   * @returns {Promise<UUID[]>}
   */
  static getForUser(user_id) {
    return db.selectIds('contact/attribute_def/for_user', [
      user_id
    ])
  }

  /**
   * Get all global attributes accessible to everyone
   * @returns {Promise<UUID[]>}
   */
  static getGlobalDefs() {
    return db.selectIds('contact/attribute_def/globals', [])
  }
}

Orm.register('contact_attribute_def', 'ContactAttributeDef', ContactAttributeDef)

module.exports = ContactAttributeDef
