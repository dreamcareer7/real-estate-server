const db = require('../../../../utils/db')
const { get } = require('./get')
const { expect } = require('../../../../utils/validator')

/**
 * delete lead channel
 * @param {UUID} id - channel id
 * @param {UUID} userId - user id
 * @returns {Promise<>}
 */

const deleteById = async (id, userId) => {
  expect(id).to.be.uuid
  const channel = await get(id)
  if (channel.user !== userId) {
    throw Error.Unauthorized()
  }
  return db.insert('contact/lead/channel/delete', [id])
}

module.exports = { deleteById }
