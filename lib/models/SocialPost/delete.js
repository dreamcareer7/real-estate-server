const db = require('../../utils/db')
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
  if (!await hasAccessForDelete({ brand, id })) {
    throw Error.Forbidden('Access denied')
  }
  await db.update('social_post/delete', [id])
}

module.exports = {
  deletePost,
}
