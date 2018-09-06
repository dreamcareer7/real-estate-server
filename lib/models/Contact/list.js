const _ = require('lodash')
const { EventEmitter } = require('events')

const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const expect = validator.expect

const Orm = require('../Orm')
const AttributeDef = require('./attribute_def')

class ContactListClass extends EventEmitter {
  /**
   * Create a contact list
   * @param {UUID} user_id 
   * @param {UUID} brand_id 
   * @param {IContactList} data 
   */
  async create(user_id, brand_id, data) {
    const id = await db.insert('contact/list/create', [
      user_id,
      brand_id,
      JSON.stringify(data.filters),
      data.query,
      data.name,
      data.is_pinned || false,
      data.touch_freq
    ])

    this.emit('create', id)

    return id
  }

  async formatCriteria(filters) {
    const defs = await AttributeDef.getAll(filters.map(f => f.attribute_def))
    const defs_by_id = _.keyBy(defs, 'id')

    return filters
      .filter(f => defs_by_id.hasOwnProperty(f.attribute_def))
      .map(f => {
        const label = defs_by_id[f.attribute_def].label
        const op = f.invert ? '≠' : '='
        const value = f.value

        return `(${label} ${op} ${value})`
      })
      .join(' AND ')
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
   * Get list ids accessible by at least one of the brands
   * @param {UUID[]} brands Owners
   * @returns {Promise<UUID[]>}
   */
  getForBrands(brands) {
    return db.selectIds('contact/list/list_for_brands', [brands])
  }

  /**
   * Get contact lists by owner brand
   * @param {UUID} brand_id owner of the lists
   * @returns {Promise<IContactList[]>}
   */
  async getForBrand(brand_id) {
    const ids = await this.getForBrands([brand_id])
    return this.getAll(ids)
  }

  async update(id, {filters, name, is_pinned, query, touch_freq}, user_id) {
    const result = await db.update('contact/list/update', [
      id,
      JSON.stringify(filters),
      query,
      name,
      is_pinned,
      touch_freq,
      user_id
    ])

    this.emit('update', id)

    return result
  }

  /**
   * Delete list by id
   * @param {UUID} id List id to be deleted
   */
  async delete(id, user_id) {
    const updated_rows = await db.update('contact/list/delete', [
      id,
      user_id
    ])

    if (updated_rows > 0) {
      this.emit('delete', id)
    }

    return updated_rows
  }

  /**
   * Performs access control for the brand on a number of list ids
   * @param {UUID} brand_id Brand id requesting access
   * @param {TAccessActions} op Action the user is trying to perform
   * @param {UUID[]} list_ids List ids to perform access control
   * @returns {Promise<Map<UUID, boolean>>}
   */
  async hasAccess(brand_id, op, list_ids) {
    expect(list_ids).to.be.an('array')

    const access = op === 'read' ? 'read' : 'write'
    const rows = await db.select('contact/list/has_access', [
      Array.from(new Set(list_ids)),
      brand_id
    ])

    const foundIndex = _.keyBy(rows, 'id')

    const accessIndex = list_ids.reduce((index, tid) => {
      return index.set(
        tid,
        foundIndex.hasOwnProperty(tid) && foundIndex[tid][access]
      )
    }, new Map())

    return accessIndex
  }

  async createDefaultListsForBrand(brand_id) {
    const list_ids = await db.selectIds('contact/list/create_default_lists', [ brand_id ])

    for (const id of list_ids) {
      this.emit('create', id)
    }

    return list_ids
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