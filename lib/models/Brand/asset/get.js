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

const getByBrands = async ({brands, template_types, mediums}) => {
  const { rows } = await db.query.promise('brand/asset/by-brand', [brands, template_types, mediums])
  const ids = rows.map(r => r.id)
  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  getByBrands
}
