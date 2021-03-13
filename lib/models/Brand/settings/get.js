const db = require('../../../utils/db')

const getByBrands = async ids => {
  const { rows } = await db.query.promise('brand/settings/get', [ids])

  return rows
}

const getByBrand = async id => {
  const [ setting ] = await getByBrands([id])
  if (!setting)
    throw new Error(`Setting for brand ${id}`)

  return setting
}

module.exports = {
  getByBrand,
  getByBrands
}
