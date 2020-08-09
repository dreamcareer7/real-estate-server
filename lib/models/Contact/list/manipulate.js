const _ = require('lodash')
const Context = require('../../Context')
const AttributeDef = require('../attribute_def/get')

const emitter = require('./emitter')

const db = require('../../../utils/db.js')
const validator = require('../../../utils/validator.js')
const expect = validator.expect

/**
 * Create a contact list
 * @param {UUID | undefined} user_id 
 * @param {UUID} brand_id 
 * @param {IContactListInput} list 
 * @param {TContactActionReason} _reason
 */
async function create(user_id, brand_id, list, _reason = 'direct_request') {
  expect(list.name).to.be.a('string')

  const id = await db.insert('contact/list/create', [
    /* created_by:    */ user_id,
    /* brand:         */ brand_id,
    /* name:          */ list.name,
    /* touch_freq:    */ (list.touch_freq && list.touch_freq > 0) ? list.touch_freq : null,
    /* is_editable:   */ list.is_editable === undefined ? true : list.is_editable,
    /* is_and_filter: */ list.args ? list.args.filter_type !== 'or' : true,
    /* query:         */ (list.args ? list.args.q : null) || list.query,
    /* crm_tasks:     */ list.args ? list.args.crm_tasks : null,
    /* flows:         */ list.args ? list.args.flows : null,
    /* filters:       */ JSON.stringify(list.filters || []),
    /* created_within */ Context.getId(),
    /* created_for:   */ _reason
  ])

  emitter.emit('create', id)

  return id
}

/**
 * @param {IContactList} list 
 */
async function formatCriteria(list) {
  const filters = list.filters
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
    .join( (list.args && list.args.filter_type === 'or') ? ' OR ' : ' AND ')
}

/**
 * @param {UUID} id 
 * @param {IContactListInput} list 
 * @param {UUID} user_id 
 * @param {TContactActionReason} _reason
 */
async function update(id, list, user_id, _reason = 'direct_request') {
  const result = await db.update('contact/list/update', [
    /* id:            */ id,
    /* updated_by:    */ user_id,
    /* name:          */ list.name,
    /* touch_freq:    */ (list.touch_freq && list.touch_freq > 0) ? list.touch_freq : null,
    /* is_and_filter: */ list.args ? list.args.filter_type !== 'or' : true,
    /* query:         */ (list.args ? list.args.q : null) || list.query,
    /* crm_tasks:     */ list.args ? list.args.crm_tasks : null,
    /* flows:         */ list.args ? list.args.flows : null,
    /* filters:       */ JSON.stringify(list.filters || []),
    /* updated_within */ Context.getId(),
    /* updated_for:   */ _reason
  ])

  emitter.emit('update', id)

  return result
}

/**
 * Delete list by id
 * @param {UUID[]} ids List id to be deleted
 * @param {UUID} user_id
 * @param {TContactActionReason} _reason
 */
async function deleteList(ids, user_id, _reason = 'direct_request') {
  const updated_rows = await db.update('contact/list/delete', [
    ids,
    user_id,
    Context.getId(),
    _reason
  ])

  if (updated_rows > 0) {
    emitter.emit('delete', ids)
  }

  return updated_rows
}

module.exports = {
  formatCriteria,
  create,
  update,
  delete: deleteList,
}
