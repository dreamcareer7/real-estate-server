const _ = require('lodash')

const db = require('../../utils/db.js')

const ObjectUtil = require('../ObjectUtil')
const Orm = require('../Orm')

class SubContact {
  /**
   * Get real contacts by id
   * @param {UUID[]} ids
   * @param {UUID=} user_id
   * @returns {Promise<IContact[]>}
   */
  static async getAll(ids, user_id) {
    if (!user_id) user_id = ObjectUtil.getCurrentUser()

    const contacts = await db.select('contact/sub_contact/get', [ids, user_id])
    
    return contacts
  }
}

SubContact.associations = {
  attributes: {
    model: 'ContactAttribute',
    collection: true
  },
  users: {
    collection: true,
    optional: true,
    model: 'User',
    enabled: false
  },
  deals: {
    collection: true,
    optional: true,
    model: 'Deal',
    enabled: false
  }
}

Orm.register('sub_contact', 'SubContact', SubContact)

module.exports = SubContact
