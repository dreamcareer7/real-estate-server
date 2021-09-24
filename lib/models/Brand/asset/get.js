const db = require('../../../utils/db')

const get = async id => {
  const assets = await getAll([id])
  if (assets.length < 1)
    throw Error.ResourceNotFound(`Brand Asset ${id} not found`)

  return assets[0]
}

const getAll = async ids => {
  const { rows } = await db.query.promise('brand/asset/get', [ids])
  return rows
}

const getByBrand = async (brand, template_types) => {
  const { rows } = await db.query.promise('brand/asset/by-brand', [brand, template_types])
  const ids = rows.map(r => r.id)
  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  getByBrand
}
