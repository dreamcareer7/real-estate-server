const BrandList = require('../../Brand/list')
const ListMember = require('../list_members')
const List = require('../list')
const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')
const { peanar } = require('../../../utils/peanar')

/**
 * @param {UUID} list_id 
 */
async function update_list_memberships(list_id) {
  return ListMember.updateListMemberships(list_id)
}

/**
 * @param {UUID[]} contact_ids 
 */
async function update_contact_memberships(contact_ids) {
  return ListMember.updateContactMemberships(contact_ids)
}

/**
 * @param {UUID[]} contact_ids 
 */
async function delete_contact_memberships(contact_ids) {
  return ListMember.deleteByContactIds(contact_ids)
}

/**
 * @param {UUID[]} list_ids
 */
async function delete_list_memberships(list_ids) {
  return ListMember.deleteByListIds(list_ids)
}

function remove_object_from_array_arg(brand, arg, value) {
  const q = sq.update()
    .table('crm_lists')
    .set(arg, sq.rstr(`array_diff(${arg}, $1)`))
    .where(`${arg} && $1`)
    .where('brand = $2')

  return db.update(q, [
    value,
    brand
  ])
}

async function remove_crm_tasks_from_lists(brand_id, task_ids) {
  return remove_object_from_array_arg(brand_id, 'crm_tasks', task_ids)
}

async function remove_flow_from_lists(brand_id, flow_id) {
  return remove_object_from_array_arg(brand_id, 'flows', [flow_id])
}

async function create_default_lists(brand_id) {
  const templates = await BrandList.getForBrand(brand_id)
  const ids = []

  for (const tpl of templates) {
    const id = await List.create(undefined, brand_id, tpl, 'system')
    ids.push(id)
  }

  return ids
}

module.exports = {
  update_list_memberships: peanar.job(update_list_memberships, 'contacts'),
  update_contact_memberships: peanar.job(update_contact_memberships, 'contacts'),
  delete_contact_memberships: peanar.job(delete_contact_memberships, 'contacts'),
  delete_list_memberships: peanar.job(delete_list_memberships, 'contacts'),

  remove_crm_tasks_from_lists: peanar.job(remove_crm_tasks_from_lists, 'contacts'),
  remove_flow_from_lists: peanar.job(remove_flow_from_lists, 'contacts'),

  create_default_lists: peanar.job(create_default_lists, 'contacts'),
}
