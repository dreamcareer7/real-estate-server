const db = require('../../../utils/db')

/**
 * @param {UUID[]} ids
 */
async function getAll(ids) {
  return db.select('showing/availability/get', [ids])
}

async function get(id) {
  const [ result ] = await getAll([id])
  return result
}

module.exports = {
  get,
  getAll,
}
