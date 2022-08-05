const db = require('../../utils/db')
const { get } = require('./get')
const { expect } = require('../../utils/validator')
const { hasAccessForDelete } = require('./access')
/**
 * delete social post from database (soft delete)
 * @param {Object} obj  
 * @param {UUID} obj.brand - brand id 
 * @param {UUID} obj.id - social post id
 * @returns {Promise<>}
 */
const deletePost = async ({id, brand}) => {
  expect(id).to.be.uuid
  const socialPost = await get(id)
  if (!hasAccessForDelete({ brand, socialPost })) {
    throw Error.Forbidden('Access denied')
  }
  await db.update('social_post/delete', [id])
}

module.exports = {
  deletePost,
}
