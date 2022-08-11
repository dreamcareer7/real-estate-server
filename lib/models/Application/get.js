const db = require('../../utils/db')

async function getAll(ids) {
  return await db.select('application/get', [ids])
}

async function get(id) {
  const [result] = await getAll([id])
  return result
}

module.exports = {
  get,
  getAll
}
