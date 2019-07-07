const db = require('../../../utils/db')
const { peanar } = require('../../../utils/peanar')

const Contact = require('../index')

async function refreshContactsUsers() {
  await db.executeSql.promise('REFRESH MATERIALIZED VIEW contacts_users', [])
}

async function update_summary(contact_ids) {
  await Contact.updateSummary(contact_ids)
}

module.exports = {
  refreshContactsUsers,
  update_summary: peanar.job(update_summary, { exchange: 'contacts', queue: 'contacts' }),
}
