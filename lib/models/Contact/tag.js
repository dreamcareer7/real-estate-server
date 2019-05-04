const { expect } = require('chai')

const db = require('../../utils/db')
const Contact = require('./index')

const ContactTag = {
  /**
   * @param {UUID} brand_id
   * @param {UUID} user_ids
   */
  async getAll(brand_id) {
    return db.select('contact/tag/get', [
      brand_id
    ])
  },

  /**
   * @param {UUID} brand_id 
   * @param {UUID} created_by 
   * @param {string} tag_name 
   */
  async create(brand_id, created_by, tag_name) {
    expect(tag_name).not.to.be.empty

    try {
      return await db.query.promise('contact/tag/create', [
        brand_id,
        created_by,
        tag_name
      ])
    }
    catch (ex) {
      if (ex.constraint === 'crm_tags_brand_tag_key') {
        throw Error.Conflict(ex.detail)
      } else {
        throw ex
      }
    }
  },

  /**
   * @param {UUID} brand_id
   * @param {UUID} user_id
   * @param {string} src
   * @param {string} dst
   */
  async rename(brand_id, user_id, src, dst) {
    expect(dst).not.to.be.empty

    try {
      const affected_contacts = await db.map('contact/tag/rename', [
        brand_id,
        src,
        dst,
      ], 'contact')

      if (affected_contacts.length > 0) {
        Contact.emit('update', {
          user_id,
          brand_id,
          contact_ids: affected_contacts,
          event_type: 'tag'
        })
      }
    }
    catch (ex) {
      if (ex.constraint === 'crm_tags_brand_tag_key') {
        throw Error.Conflict({
          slack: false,
          skip_trace_log: true,
          message: ex.detail
        })
      } else {
        throw ex
      }
    }
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
      user_id,
      tags,
      case_sensitive
    ])

    if (affected_contacts.length > 0) {
      Contact.emit('update', {
        user_id,
        brand_id,
        contact_ids: affected_contacts,
        event_type: 'tag'
      })
    }
  }
}

module.exports = ContactTag
