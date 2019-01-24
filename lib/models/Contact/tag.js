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
   * @param {string[]} tags
   */
  async delete(brand_id, user_id, tags, case_sensitive = true) {
    if (!case_sensitive) {
      tags = tags.map(t => t.toLowerCase())
    }

    const affected_contacts = await db.selectIds('contact/tag/delete', [
      brand_id,
      tags,
      case_sensitive
    ])

    Contact.emit('update', {
      user_id,
      brand_id,
      contact_ids: affected_contacts,
      event_type: 'tag'
    })
  },

  async supportDeleteAllTags(brand_id, user_id) {
    const affected_contacts = await db.selectIds('contact/tag/support_delete_all', [
      user_id,
      brand_id
    ])

    Contact.emit('update', {
      user_id,
      brand_id,
      contact_ids: affected_contacts,
      event_type: 'tag'
    })
  }
}

module.exports = ContactTag
