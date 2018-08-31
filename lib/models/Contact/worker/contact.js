const db = require('../../../utils/db')

async function refreshContactsUsers() {
  await db.executeSql.promise('REFRESH MATERIALIZED VIEW contacts_users', [])
}

module.exports = {
  refreshContactsUsers
}