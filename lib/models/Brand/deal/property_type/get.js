const db = require('../../../../utils/db')

const get = async id => {
  const contexts = await getAll([id])
  if (contexts.length < 1)
    throw Error.ResourceNotFound(`Brand Property Type ${id} not found`)

  return contexts[0]
}

const getAll = async ids => {
  const res = await db.query.promise('brand/deal/property_type/get', [ids])
  return res.rows
}

const getByBrand = async brand => {
  const res = await db.query.promise('brand/deal/property_type/by-brand', [brand])

  const ids = res.rows.map(r => r.id)

  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  getByBrand
}
