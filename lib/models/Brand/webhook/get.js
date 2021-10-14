const db = require('../../../utils/db')

const get = async id => {
  const webhooks = await getAll([id])
  if (webhooks.length < 1)
    throw Error.ResourceNotFound(`Brand Webhook Type ${id} not found`)

  return webhooks[0]
}

const getAll = async ids => {
  const res = await db.query.promise('brand/webhook/get', [ids])
  return res.rows
}

const find = async (brand, topic) => {
  const ids = await db.selectIds('brand/webhook/find', [brand, topic])
  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  find
}
