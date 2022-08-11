const db = require('../../utils/db')
const { hasAccessForUpdate } = require('./access')
const { expect } = require('../../utils/validator')

const { get } = require('./get')
/**
 * update social post into database
 * @param {Object} obj
 * @param {number} obj.dueAt - due_at in timestamp
 * @param {UUID} obj.brand - brand id
 * @param {UUID} obj.user - user id
 * @param {UUID} obj.id - social post id
 * @returns {Promise<>}
 */

const update = async ({ id, dueAt, brand, user }) => {
  expect(dueAt).to.be.date
  expect(id).to.be.uuid
  
  const socialPost = await get(id)

  if (!hasAccessForUpdate({ brand, socialPost })) {
    throw Error.Forbidden('Access denied')
  }
  
  if (socialPost.executed_at) {
    throw Error.Forbidden('This Post is Executed')
  }
  
  // TODO how can make the DB error not visible in production
  return db.update('social_post/update', [id, new Date(dueAt).getTime() / 1000])
}

module.exports = {
  update,
}
