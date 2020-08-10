const db = require('../../utils/db.js')


const get = async id => {
  const forms = await getAll([id])

  if (forms.length < 1) {
    throw Error.ResourceNotFound(`Form ${id} not found`)
  }

  return forms[0]
}

const getAll = async ids => {
  const { rows } = await db.query.promise('form/get', [ids])

  return rows
}

const getByBrand = async (brand) => {
  const { rows } = await db.query.promise('form/by-brand', [brand])
  const ids = rows.map(r => r.id)

  return getAll(ids)
}


module.exports = {
  get,
  getAll,
  getByBrand
}