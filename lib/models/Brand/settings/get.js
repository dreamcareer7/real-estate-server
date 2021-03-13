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

/*
 * We have constraints in place to make sure brand_settings.id and brand_settings.brand are the same
 * Therefore, getAll and getByBrands are the same.
 */

module.exports = {
  getByBrand,
  getByBrands,
  getAll: getByBrands
}
