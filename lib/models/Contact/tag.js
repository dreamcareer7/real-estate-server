const db = require('../../utils/db')
const Contact = require('./index')

const ContactTag = {
  /**
   * @param {UUID} brand_id
   * @param {UUID} user_ids
   */
  async getAll(brand_id, user_ids) {
    return db.select('contact/tag/get', [
      brand_id,
      user_ids
    ])
  },

  /**
   * @param {UUID} brand_id
   * @param {UUID} user_id
   * @param {string} src
   * @param {string} dst
   */
  async rename(brand_id, user_id, src, dst) {
    const affected_contacts = await db.map('contact/tag/rename', [
      brand_id,
      src,
      dst,
    ], 'contact')

    Contact.emit('update', {
      user_id,
      brand_id,
      contact_ids: affected_contacts,
      event_type: 'tag'
    })
  },

  /**
   * @param {UUID} brand_id
   * @param {UUID} user_id
   * @param {string} tag
   */
  async delete(brand_id, user_id, tag) {
    const affected_contacts = await db.map('contact/tag/delete', [
      brand_id,
      tag
    ], 'contact')

    Contact.emit('update', {
      user_id,
      brand_id,
      contact_ids: affected_contacts,
      event_type: 'tag'
    })
  }
}

module.exports = ContactTag
