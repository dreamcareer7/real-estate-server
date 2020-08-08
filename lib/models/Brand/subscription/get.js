const db = require('../../../utils/db')

const get = async id => {
  const subscription = await getAll([id])
  if (subscription.length < 1)
    throw Error.ResourceNotFound(`Subscription ${id} not found`)

  return subscription[0]
}

const getAll = async ids => {
  return await db.select('brand/subscription/get', [ids])
}

module.exports = {
  get,
  getAll
}
