const { EventEmitter } = require('events')

const db = require('../../utils/db.js')
const Orm = require('../Orm')

class ContactListClass extends EventEmitter {
  /**
   * Create a contact list
   * @param {UUID} user_id 
   * @param {IContactList} data 
   */
  async create(user_id, data) {
    const id = await db.insert('contact/list/create', [
      user_id,
      JSON.stringify(data.filters),
      data.query,
      data.name,
      data.is_pinned || false,
      data.touch_freq
    ])

    this.emit('create', id)

    return id
  }

  /**
   * Get contact lists by id
   * @param {UUID[]} ids 
   * @returns {Promise<IContactList[]>}
   */
  async getAll(ids) {
    return db.select('contact/list/get', [ids])
  }

  /**
   * Get list by id
   * @param {UUID} id 
   */
  async get(id) {
    const res = await this.getAll([id])
    if (res.length > 0)
      return res[0]
  }

  /**
   * Get list ids accessible by at least one of the users
   * @param {UUID[]} user_ids Owners
   * @returns {Promise<UUID[]>}
   */
  getForUsers(user_ids) {
    return db.selectIds('contact/list/list_for_users', [user_ids])
  }

  /**
   * Get contact lists by owner user id
   * @param {UUID} userID owner of the lists
   * @returns {Promise<IContactList[]>}
   */
  async getForUser(userID) {
    const ids = await this.getForUsers([userID])
    return this.getAll(ids)
  }

  async update(id, {filters, name, is_pinned, query, touch_freq}) {
    const result = await db.update('contact/list/update', [
      id,
      JSON.stringify(filters),
      query,
      name,
      is_pinned,
      touch_freq
    ])

    this.emit('update', id)

    return result
  }

  /**
   * Delete list by id
   * @param {UUID} id List id to be deleted
   */
  async delete(id) {
    const updated_rows = await db.update('contact/list/delete', [id])

    if (updated_rows > 0) {
      this.emit('delete', id)
    }

    return updated_rows
  }

  async checkAccess(userID, id) {
    const ids = await db.selectIds('contact/list/list_for_users', [[userID]])
    if (!ids.includes(id)) {
      throw Error.Forbidden('Access denied to search filter resource')
    }
  }

  publicize(model) {
    if (Array.isArray(model.filters)) {
      for (const f of model.filters) {
        f.type = 'contact_list_filter'
      }
    }
  }
}

const ContactList = new ContactListClass

Orm.register('contact_list', 'ContactList', ContactList)

module.exports = ContactList