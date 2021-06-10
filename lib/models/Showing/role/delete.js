const db = require('../../../utils/db')
const { get } = require('./get')

/**
 * @param {UUID} id 
 */
async function deleteRole(id) {
  const current = await get(id)
  if (!current) {
    throw Error.ResourceNotFound('Showing role does not exist')
  }

  if (current.role === 'SellerAgent') {
    throw Error.Validation('SellerAgent role cannot be deleted from a showing!')
  }

  return db.update('showing/role/delete', [ id ])
}

module.exports = {
  delete: deleteRole,
}
