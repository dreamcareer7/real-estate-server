const db = require('../../../utils/db')

/**
 * @param {UUID} showing 
 * @param {UUID} user 
 * @returns {Promise<boolean>}
 */
async function hasAccess(showing, user, canWrite = false) {
  const { has_access } = await db.selectOne('showing/showing/access', [
    showing,
    user,
    canWrite
  ])

  return has_access
}

module.exports = {
  hasAccess
}
