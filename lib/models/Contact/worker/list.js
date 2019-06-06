const BrandList = require('../../Brand/list')
const ListMember = require('../list_members')
const List = require('../list')
const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')

async function update_list_memberships(job) {
  return ListMember.updateListMemberships(job.data.list_id)
}

async function update_contact_memberships(job) {
  return ListMember.updateContactMemberships(job.data.contact_ids)
}

async function delete_contact_memberships(job) {
  return ListMember.deleteByContactIds(job.data.contact_ids)
}

async function delete_list_memberships(job) {
  return ListMember.deleteByListIds(job.data.list_ids)
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

async function remove_crm_tasks_from_lists(job) {
  const { brand_id, task_ids } = job.data

  return remove_object_from_array_arg(brand_id, 'crm_tasks', task_ids)
}

async function remove_flow_from_lists(job) {
  const { brand_id, flow_id } = job.data

  return remove_object_from_array_arg(brand_id, 'flows', [flow_id])
}

async function create_default_lists(job) {
  const templates = await BrandList.getForBrand(job.data.brand_id)
  const ids = []

  for (const tpl of templates) {
    const id = await List.create(undefined, job.data.brand_id, tpl)
    ids.push(id)
  }

  return ids
}

module.exports = {
  update_list_memberships,
  update_contact_memberships,
  delete_contact_memberships,
  delete_list_memberships,

  remove_crm_tasks_from_lists,
  remove_flow_from_lists,

  create_default_lists,
}
