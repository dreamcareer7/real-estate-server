const db = require('../../../utils/db')

const get = async id => {
  const assets = await getAll([id])

  if (assets.length < 1)
    throw new Error.ResourceNotFound(`Template asset ${id} not found`)

  return assets[0]
}

const getAll = async ids => {
  const res = await db.query.promise('template/asset/get', [ids])
  return res.rows
}

module.exports = {
  get,
  getAll
}
