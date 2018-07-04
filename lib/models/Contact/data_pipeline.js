const ListMember = require('./list_members')

async function update_list_memberships(job) {
  return ListMember.updateListMemberships(job.data.list_id)
}

async function update_contact_memberships(job) {
  return ListMember.updateContactMemberships(job.data.contact_ids)
}

async function delete_contact_memberships(job) {
  return ListMember.deleteForContacts(job.data.contact_ids)
}

module.exports = {
  update_list_memberships,
  update_contact_memberships,
  delete_contact_memberships,
}