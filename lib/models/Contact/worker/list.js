const BrandList = require('../../Brand/list')
const ListMember = require('../list_members')
const List = require('../list')

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
  create_default_lists,
}
