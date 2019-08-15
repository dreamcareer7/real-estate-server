const { expect } = require('chai')
const { EventEmitter } = require('events')

const db = require('../../utils/db')
const sql = require('../../utils/sql')
const Contact = require('./index')

const Context = require('../Context')

class ContactTag extends EventEmitter {
  /**
   * @param {UUID} brand_id
   */
  async getAll(brand_id) {
    return db.select('contact/tag/get', [
      brand_id
    ])
  }

  /**
   * @param {UUID} brand_id 
   * @param {UUID} created_by 
   * @param {string} tag_name 
   * @param {number | null} touch_freq
   */
  async create(brand_id, created_by, tag_name, touch_freq) {
    expect(tag_name).not.to.be.empty

    try {
      return await db.query.promise('contact/tag/create', [
        brand_id,
        created_by,
        Context.getId(),
        tag_name,
        touch_freq
      ])
    }
    catch (ex) {
      if (ex.constraint === 'crm_tags_brand_tag_key') {
        throw Error.Conflict(ex.detail)
      } else {
        throw ex
      }
    }
  }

  /**
   * @param {UUID} brand_id
   * @param {UUID} user_id
   * @param {string} src
   * @param {string} dst
   */
  async rename(brand_id, user_id, src, dst) {
    expect(src).not.to.be.empty
    expect(dst).not.to.be.empty

    try {
      const affected_contacts = await db.map('contact/tag/rename', [
        brand_id,
        src,
        dst,
        user_id,
        Context.getId()
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
  }

  /**
   * @param {UUID} brand_id
   * @param {UUID} user_id
   * @param {string} tag
   * @param {number | null} touch_freq
   */
  async update_touch_frequency(brand_id, user_id, tag, touch_freq) {
    await db.update('contact/tag/update_touch_freq', [
      brand_id,
      tag,
      touch_freq,
      user_id,
      Context.getId()
    ])

    this.emit('update:touch_freq', { brand: brand_id, tag })
  }

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
      case_sensitive,
      Context.getId()
    ])

    if (affected_contacts.length > 0) {
      Contact.emit('update', {
        user_id,
        brand_id,
        contact_ids: affected_contacts,
        event_type: 'tag'
      })
    }

    for (const tag of tags) {
      this.emit('delete', { brand: brand_id, tag, contacts: affected_contacts })
    }
  }
}

module.exports = new ContactTag
