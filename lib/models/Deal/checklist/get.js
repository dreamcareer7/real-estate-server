const db = require('../../../utils/db')

const get = async id => {
  const checklists = await getAll([id])
  if (checklists.length < 1)
    throw Error.ResourceNotFound(`Checklist ${id} not found`)

  return checklists[0]
}

const getAll = async ids => {
  const res = await db.query.promise('deal/checklist/get', [ids])
  return res.rows
}

module.exports = {
  get,
  getAll
}
