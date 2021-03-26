const db = require('../../../utils/db')
const sql = require('../../../utils/sql')

/**
 * @param {UUID} showing 
 * @param {UUID} user 
 */
async function hasAccess(showing, user) {
  const { has_access } = await db.selectOne('showing/showing/access', [
    showing,
    user
  ])

  return has_access
}

module.exports = {
  hasAccess
}
