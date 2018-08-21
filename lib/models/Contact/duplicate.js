const db = require('../../utils/db')
const Orm = require('../Orm')

class ContactDuplicate {
  /**
   * Finds merge suggestions for a user
   * @param {UUID} user_id 
   * @param {PaginationOptions} query
   * @returns {Promise<IContactDuplicateCluster[]>}
   */
  findForUser(user_id, query) {
    return db.select('contact/duplicate/for_user', [
      user_id,
      query.start,
      query.limit
    ])
  }

  /**
   * Finds merge suggestions for a contact
   * @param {UUID} user_id 
   * @param {UUID} contact_id
   * @returns {Promise<IContactDuplicateCluster>}
   */
  findForContact(user_id, contact_id) {
    return db.selectOne('contact/duplicate/for_contact', [
      user_id,
      contact_id
    ])
  }
}

ContactDuplicate.prototype.associations = {
  contacts: {
    model: 'Contact',
    collection: true
  }
}

const Model = new ContactDuplicate

Orm.register('contact_duplicate', 'ContactDuplicate', Model)

module.exports = Model