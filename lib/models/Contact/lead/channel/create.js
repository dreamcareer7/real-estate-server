const db = require('../../../../utils/db')

/**
 * Insert lead channel into database
 * @param {import('./types').LeadChannelInput} userInput
 * @param {UUID} user - user id
 * @param {UUID} brand - brand id
 * @returns {Promise<UUID>}
 */

const create = async (userInput, user, brand) => {
  const { sourceType } = userInput || {}
  if (!brand) {
    throw Error.BadRequest('Brand is not specified')
  }

  if (!sourceType) {
    throw Error.BadRequest('Source type is not specified')
  }

  if (!user) {
    throw Error.BadRequest('user is not specified')
  }


  const id = await db.insert('contact/lead/channel/insert', [
    user,
    brand,
    sourceType,
  ])
  return id
}

module.exports = { create }
