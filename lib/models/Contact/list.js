const _ = require('lodash')
const { EventEmitter } = require('events')

const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const expect = validator.expect

const Orm = require('../Orm')
const AttributeDef = require('./attribute_def')

class ContactList extends EventEmitter {
  /**
   * Create a contact list
   * @param {UUID | undefined} user_id 
   * @param {UUID} brand_id 
   * @param {IContactListInput} list 
   */
  async create(user_id, brand_id, list) {
    expect(list.name).to.be.a('string')

    const id = await db.insert('contact/list/create', [
      /* created_by:    */ user_id,
      /* brand:         */ brand_id,
      /* name:          */ list.name,
      /* touch_freq:    */ list.touch_freq,
      /* is_editable:   */ list.is_editable === undefined ? true : list.is_editable,
      /* is_and_filter: */ list.args ? list.args.filter_type !== 'or' : true,
      /* query:         */ (list.args ? list.args.q : null) || list.query,
      /* crm_task:      */ list.args ? list.args.crm_task : null,
      /* flows:         */ list.args ? list.args.flows : null,
      /* filters:       */ JSON.stringify(list.filters)
    ])

    this.emit('create', id)

    return id
  }

  async formatCriteria(data) {
    const filters = data.filters
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
      .join( (data.args && data.args.filter_type === 'or') ? ' OR ' : ' AND ')
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
    if (res.length < 1)
      throw Error.ResourceNotFound('ContactList not found.')

    return res[0]
  }

  /**
   * Get list ids accessible by at least one of the brands
   * @param {UUID[]} brands Brands
   * @param {UUID[]=} users Owners
   * @returns {Promise<UUID[]>}
   */
  getForBrands(brands, users) {
    return db.selectIds('contact/list/list_for_brands', [brands, users])
  }

  /**
   * Get contact lists by owner brand
   * @param {UUID} brand Brand of the lists
   * @param {UUID[]=} users Owners of the lists
   * @returns {Promise<IContactList[]>}
   */
  async getForBrand(brand, users) {
    const ids = await this.getForBrands([brand], users)
    return this.getAll(ids)
  }

  /**
   * @param {UUID} id 
   * @param {IContactListInput} list 
   * @param {UUID} user_id 
   */
  async update(id, list, user_id) {
    const result = await db.update('contact/list/update', [
      /* id:            */ id,
      /* updated_by:    */ user_id,
      /* name:          */ list.name,
      /* touch_freq:    */ list.touch_freq,
      /* is_and_filter: */ list.args ? list.args.filter_type !== 'or' : true,
      /* query:         */ (list.args ? list.args.q : null) || list.query,
      /* crm_task:      */ list.args ? list.args.crm_task : null,
      /* flows:         */ list.args ? list.args.flows : null,
      /* filters:       */ JSON.stringify(list.filters)
    ])

    this.emit('update', id)

    return result
  }

  /**
   * Delete list by id
   * @param {UUID[]} ids List id to be deleted
   * @param {UUID} user_id
   */
  async delete(ids, user_id) {
    const updated_rows = await db.update('contact/list/delete', [
      ids,
      user_id
    ])

    if (updated_rows > 0) {
      this.emit('delete', ids)
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
}

ContactList.prototype.associations = {
  flows: {
    model: 'BrandFlow',
    enabled: false,
    collection: true,
    ids: async (list) => list.args.flows
  },
  crm_task: {
    model: 'CrmTask',
    enabled: false,
    collection: true,
    ids: async list => list.args.crm_task
  }
}

const Model = new ContactList

Orm.register('contact_list', 'ContactList', Model)

module.exports = Model
