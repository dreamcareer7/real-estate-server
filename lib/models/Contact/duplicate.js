const db = require('../../utils/db')
const Orm = require('../Orm')

class ContactDuplicate {
  /**
   * Finds merge suggestions for a brand
   * @param {UUID} brand_id 
   * @param {PaginationOptions} query
   * @returns {Promise<IContactDuplicateCluster[]>}
   */
  findForBrand(brand_id, query) {
    return db.select('contact/duplicate/for_brand', [
      brand_id,
      query.start,
      query.limit
    ])
  }

  /**
   * Finds merge suggestions for a contact
   * @param {UUID} brand_id 
   * @param {UUID} contact_id
   * @returns {Promise<IContactDuplicateCluster>}
   */
  findForContact(brand_id, contact_id) {
    return db.selectOne('contact/duplicate/for_contact', [
      brand_id,
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