const db = require('../../../utils/db')

const get = async id => {
  const subscription = await getAll([id])
  if (subscription.length < 1)
    throw Error.ResourceNotFound(`Brand subscription ${id} not found`)

  return subscription[0]
}

const getAll = async ids => {
  return await db.select('brand/subscription/get', [ids])
}

const getByBrand = async brand => {
  return db.selectOne('brand/subscription/by-brand', [
    brand
  ])
}

module.exports = {
  get,
  getAll,
  getByBrand
}
