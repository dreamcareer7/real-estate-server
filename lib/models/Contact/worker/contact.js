const db = require('../../../utils/db')

const Contact = require('../index')

async function refreshContactsUsers() {
  await db.executeSql.promise('REFRESH MATERIALIZED VIEW CONCURRENTLY contacts_users', [])
}

async function update_summary(job) {
  const contact_ids = job.data.contact_ids

  await Contact.updateSummary(contact_ids)
}

module.exports = {
  refreshContactsUsers,
  update_summary,
}
