const db = require('../../utils/db')
const Orm = require('../Orm/context')
const Context = require('../Context')

async function get(id) {
  const result = await getAll([id])

  if (!Array.isArray(result) || result.length < 1)
    throw Error.ResourceNotFound(`Contact ${id} not found`)

  return result[0]
}

/**
 * Get contacts by id
 * @param {UUID[]} ids 
 * @param {UUID=} user_id 
 * @returns {Promise<IContact[]>}
 */
async function getAll(ids, user_id = undefined) {
  const current_user = Context.get('user')
  user_id = user_id || (current_user ? current_user.id : null)

  return db.select('contact/get', [
    ids,
    user_id,
    Orm.getEnabledAssociations()
  ])
}

module.exports = {
  get,
  getAll,
}
