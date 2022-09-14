const db = require('../../../../utils/db')
const { get } = require('./get')
const { expect } = require('../../../../utils/validator')

/**
 * update lead channel
 * @param {UUID} id - channel id
 * @param {UUID} userId - user id
 * @param {UUID} brand - brand id
 * @returns {Promise<>}
 */

const update = async (id, userId, brand) => {
  expect(id).to.be.uuid
  expect(brand).to.be.uuid

  const channel = await get(id)
  if (channel.user !== userId) {
    throw Error.Unauthorized()
  }
  
  return db.update('contact/lead/channel/update', [id, brand])
}

module.exports = { update }
