const db     = require('../../../utils/db')
const { notify } = require('./notify')
const { DELETE_EVENT } = require('./constants')

/**
 * @param {UUID[]} ids 
 * @param {UUID} user 
 * @param {UUID} brand 
 */
const deleteMany = async (ids, user, brand) => {
  await db.update('email/campaign/delete', [
    ids
  ])

  notify(
    DELETE_EVENT,
    user,
    brand,
    ids
  )
}

module.exports = {
  deleteMany,
}
