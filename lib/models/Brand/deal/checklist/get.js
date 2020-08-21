const db = require('../../../../utils/db')

const get = async id => {
  const checklists = await getAll([id])
  if (checklists.length < 1)
    throw Error.ResourceNotFound(`Brand Checklist ${id} not found`)

  return checklists[0]
}

const getAll = async ids => {
  const res = await db.query.promise('brand/checklist/get', [ids])
  return res.rows
}

const getByBrand = async brand => {
  const res = await db.query.promise('brand/checklist/by_brand', [brand])

  const ids = res.rows.map(r => r.id)

  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  getByBrand
}
