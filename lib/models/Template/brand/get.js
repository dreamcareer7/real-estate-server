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

module.exports = {
  get,
  getAll,
  getForBrands
}
