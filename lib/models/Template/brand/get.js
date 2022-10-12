const db = require('../../../utils/db')
const get = async id => {
  const templates = await getAll([id])

  if (templates.length < 1) {
    throw Error.ResourceNotFound(`Brand template ${id} not found`)
  }

  return templates[0]
}

const getAll = async ids => {
  const { rows } = await db.query.promise('template/brand/get', [ids])
  return rows
}

const getForBrands = async ({types = null, mediums = null, brands}) => {
  const res = await db.query.promise('template/brand/for-brand', [brands, types, mediums])
  const ids = res.rows.map(r => r.id)

  return getAll(ids)
}

const getCategoriesForBrand = async ({types = null, mediums = null, brand, filter = ''}) => {
  let filterByTemplate = '1'
  let filterByAssets = '1'

  if (filter === 'template') {
    filterByAssets = '0'
  } else if (filter === 'asset') {
    filterByTemplate = '0'
  }

  const data = await db.query.promise('template/brand/category', [brand, types, mediums, filterByTemplate, filterByAssets])

  const finalData = {}

  for (let index = 0; index < data.rows.length; index++) {
    const element = data.rows[index]
    if (!finalData[element.template_type]) {
      finalData[element.template_type] = [element.medium]
    } else {
      finalData[element.template_type].push(element.medium)
    }
  }

  return finalData
}

module.exports = {
  get,
  getAll,
  getForBrands,
  getCategoriesForBrand
}
