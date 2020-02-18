const Activity = require('../Activity')
const sql = require('../../utils/sql')

/**
 * @param {UUID} user_id 
 */
async function userImportActivities(user_id) {
  const ids = await sql.selectIds(`
    SELECT
      id
    FROM
      activities
    WHERE
      reference = $1
      AND reference_type = 'User'
      AND action = 'UserImportedContacts'
      AND deleted_at IS NULL
    ORDER BY
      created_at DESC
  `, [
    user_id
  ])

  return Activity.getAll(ids)
}

/**
 * @param {string} interval
 */
async function recentImportActivities(interval = '1 day') {
  const ids = await sql.selectIds(`
    SELECT
      id
    FROM
      activities
    WHERE
      created_at > NOW() - $1::interval
      AND reference_type = 'User'
      AND action = 'UserImportedContacts'
      AND deleted_at IS NULL
    ORDER BY
      created_at DESC
  `, [
    interval
  ])

  return Activity.getAll(ids)
}

module.exports = {
  userImportActivities,
  recentImportActivities
}
