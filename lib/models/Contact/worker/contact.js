const db = require('../../../utils/db')

const Contact = require('../index')
const ContactSummary = require('../summary')

async function refreshContactsUsers() {
  await db.executeSql.promise('REFRESH MATERIALIZED VIEW contacts_users', [])
}

async function update_display_names(job) {
  const contact_ids = job.data.contact_ids

  await db.update('contact/update_searchable_field', [contact_ids])
  const res = await db.select('contact/update_display_names', [contact_ids])

  return res
}

async function create_contact_summary(job) {
  const contact_ids = job.data.contact_ids

  await update_display_names(job)
  await ContactSummary.create(contact_ids)
}

async function update_contact_summary(job) {
  const contact_ids = job.data.contact_ids

  await update_display_names(job)
  await ContactSummary.update(contact_ids)
}

async function delete_contact_summary(job) {
  const contact_ids = job.data.contact_ids

  await update_display_names(job)
  await ContactSummary.delete(contact_ids)
}

async function update_summary(job) {
  const contact_ids = job.data.contact_ids

  await Contact.updateSummary(contact_ids)
}

module.exports = {
  refreshContactsUsers,
  update_display_names,
  create_contact_summary,
  update_contact_summary,
  delete_contact_summary,
  update_summary,
}
