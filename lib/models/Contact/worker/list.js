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
  return List.createDefaultListsForUser(job.data.user_id)
}

module.exports = {
  update_list_memberships,
  update_contact_memberships,
  delete_contact_memberships,
  delete_list_memberships,
  create_default_lists,
}
