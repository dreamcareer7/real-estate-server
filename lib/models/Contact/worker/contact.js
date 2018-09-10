const db = require('../../../utils/db')
const ContactSummary = require('../summary')

async function refreshContactsUsers() {
  await db.executeSql.promise('REFRESH MATERIALIZED VIEW contacts_users', [])
}

async function update_display_names(job) {
  const contact_ids = job.data.contact_ids

  return db.update('contact/update_display_names', [contact_ids])
}

async function create_contact_summary(job) {
  const contact_ids = job.data.contact_ids

  await ContactSummary.create(contact_ids)
}

async function update_contact_summary(job) {
  const contact_ids = job.data.contact_ids

  await ContactSummary.update(contact_ids)
}

async function delete_contact_summary(job) {
  const contact_ids = job.data.contact_ids

  await ContactSummary.delete(contact_ids)
}

module.exports = {
  refreshContactsUsers,
  update_display_names,
  create_contact_summary,
  update_contact_summary,
  delete_contact_summary
}
