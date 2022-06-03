const { expect } = require('chai')
const { EventEmitter } = require('events')

const db = require('../../utils/db')
const Contact = require('./emitter')
const Summary = require('./summary')

const Context = require('../Context')

class ContactTag extends EventEmitter {
  /**
   * @param {UUID} brand_id
   * @param {UUID[]=} users_filter
   * @param {UUID=} user
   */
  async getAll(brand_id, users_filter, user) {
    return db.select('contact/tag/get', [
      brand_id,
      users_filter,
      user
    ])
  }

  /**
   * @param {UUID} brand_id 
   * @param {UUID} created_by 
   * @param {string} tag_name 
   * @param {number | null} touch_freq
   * @param {boolean=} [auto_enroll_in_super_campaigns=null]
   */
  async create(
    brand_id, created_by, tag_name, touch_freq, auto_enroll_in_super_campaigns
  ) {
    expect(tag_name).not.to.be.empty

    try {
      const result = await db.query.promise('contact/tag/create', [
        brand_id,
        created_by,
        Context.getId(),
        tag_name,
        touch_freq
      ])

      // XXX: bad idea?!
      if (auto_enroll_in_super_campaigns === true) {
        await this.enableAutoEnrollInSuperCampaigns(
          brand_id, created_by, tag_name
        )
      } else if (auto_enroll_in_super_campaigns === false) {
        await this.disableAutoEnrollInSuperCampaigns(
          brand_id, created_by, tag_name
        )       
      }

      return result
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
   * Support function for recreating lost tags
   * @param {UUID} brand_id 
   * @param {UUID} created_by 
   */
  async recreate(brand_id, created_by) {
    return db.insert('contact/tag/recreate', [ brand_id, created_by, Context.getId() ])
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

    if (src === dst) {
      return
    }

    try {
      const affected_contacts = await db.map('contact/tag/rename', [
        brand_id,
        src,
        dst,
        user_id,
        Context.getId()
      ], 'contact')

      if (affected_contacts.length > 0) {
        await Summary.updateTags(brand_id)

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
      await Summary.updateTags(brand_id)

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

  /**
   * @param {IBrand['id']} brandId
   * @param {IUser['id']} userId
   * @param {string} tag
   */
  async enableAutoEnrollInSuperCampaigns (brandId, userId, tag) {
    return db.update(
      'contact/tag/enable_auto_enroll_in_super_campaigns',
      [brandId, userId, tag]
    )
  }
  
  /**
   * @param {IBrand['id']} brandId
   * @param {IUser['id']} userId
   * @param {string} tag
   */
  async disableAutoEnrollInSuperCampaigns (brandId, userId, tag) {
    return db.update(
      'contact/tag/disable_auto_enroll_in_super_campaigns',
      [brandId, userId, tag]
    )    
  }
}

module.exports = new ContactTag
