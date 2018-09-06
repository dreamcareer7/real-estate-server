const db = require('../../../utils/db')

async function refreshContactsUsers() {
  await db.executeSql.promise('REFRESH MATERIALIZED VIEW contacts_users', [])
}

async function update_display_names(job) {
  const contact_ids = job.data.contact_ids

  return db.update('contact/update_display_names', [contact_ids])
}

module.exports = {
  refreshContactsUsers,
  update_display_names
}