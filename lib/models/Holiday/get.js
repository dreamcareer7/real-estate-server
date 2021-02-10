const db = require('../../utils/db')

const getAll = async ids => {
  const { rows } = await db.query.promise('holiday/get', [ids])
  return rows
}

const getUpcoming = async by => {
  const { rows } = await db.query.promise('holiday/upcoming', [by])
  const ids = rows.map(h => h.id)

  return getAll(ids)
}

module.exports = {
  getAll,
  getUpcoming
}
