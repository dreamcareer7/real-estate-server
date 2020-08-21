const db = require('../../../../utils/db')

const get = async id => {
  const templates = await getAll([id])

  if (templates.length < 1)
    throw Error.ResourceNotFound(`Form Template ${id} not found`)

  return templates[0]
}

const getAll = async ids => {
  const res = await db.query.promise('brand/template/get', [ids])

  return res.rows
}

const getByForm = async ({brand, form}) => {
  const { rows } = await db.query.promise('brand/template/by-form', [
    brand,
    form
  ])

  return getAll(rows.map(r => r.id))
}

module.exports = {
  get,
  getAll,
  getByForm
}
