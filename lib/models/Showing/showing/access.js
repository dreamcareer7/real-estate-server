const db = require('../../../utils/db')

/**
 * @param {UUID} showing 
 * @param {UUID} user 
 */
async function hasAccess(showing, user) {
  const { hasAccess } = await db.selectOne('showing/showing/access', [
    showing,
    user
  ])

  return hasAccess
}

module.exports = {
  hasAccess
}
